import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import {
  addStoredMediaItem,
  resolveFtpInboxDir,
  resolveUploadsRootDir,
  scanExistingUploadsIntoMediaLibrary,
  suggestGallerySpanForImage,
  type MediaSourceKind,
  type StoredMediaItem,
} from '@esqueleto/core';

const execFileAsync = promisify(execFile);

// Evitar que libvips mantenga descriptores abiertos en Windows al borrar originales después de optimizar
sharp.cache(false);

const MAX_DIMENSION_PX = 2000;
const WEBP_QUALITY = 82;

const PROCESSABLE_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.avif',
  '.bmp',
  '.tif',
  '.tiff',
]);

let cachedHasCwebp: boolean | null = null;
let ftpSyncInFlight: Promise<FtpSyncResult> | null = null;

export type WebpEngineName = 'cwebp' | 'sharp';

export interface OptimizeMediaResult {
  item: StoredMediaItem;
  engine: WebpEngineName;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  savingPercent: number;
}

export interface FtpSyncResult {
  processed: StoredMediaItem[];
  skippedPending: number;
  errors: string[];
  engine: WebpEngineName;
}

export async function detectWebpEngine(): Promise<WebpEngineName> {
  if (cachedHasCwebp === true) return 'cwebp';
  if (cachedHasCwebp === false) return 'sharp';

  try {
    await execFileAsync('cwebp', ['-version'], { timeout: 3000 });
    cachedHasCwebp = true;
    return 'cwebp';
  } catch {
    cachedHasCwebp = false;
    return 'sharp';
  }
}

export async function probeImageDimensionsWithSharp(
  filePath: string
): Promise<{ width: number; height: number } | null> {
  try {
    const fileBuf = await fs.promises.readFile(filePath);
    const meta = await sharp(fileBuf).metadata();
    const rawW = meta.width || 0;
    const rawH = meta.height || 0;
    if (!rawW || !rawH) return null;

    // Respetar orientación EXIF 5..8 donde ancho y alto están rotados 90°/270°
    const needsSwap = meta.orientation !== undefined && meta.orientation >= 5 && meta.orientation <= 8;
    return {
      width: needsSwap ? rawH : rawW,
      height: needsSwap ? rawW : rawH,
    };
  } catch {
    return null;
  }
}

export function resolveTmpOptimizeDir(): string {
  const dir = path.join(resolveUploadsRootDir(), '.tmp-optimize');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitizeSlugName(rawName: string): string {
  const base = path.basename(rawName, path.extname(rawName));
  return (
    base
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'foto'
  );
}

function humanTitleFromName(rawName: string): string {
  const base = path.basename(rawName, path.extname(rawName));
  return (
    base
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'Fotografía'
  );
}

/**
 * Optimiza un archivo de imagen hacia WebP usando la herramienta oficial Google `cwebp`
 * (con respaldo nativo libwebp vía `sharp` en máquinas sin binario `cwebp`),
 * verifica el `.webp` resultante y BORRA el archivo original sin optimizar.
 */
export async function optimizeFileToWebpAndDeleteOriginal(params: {
  sourcePath: string;
  originalName: string;
  source: MediaSourceKind;
  showInGallery?: boolean;
  title?: string | null;
}): Promise<OptimizeMediaResult> {
  const uploadsDir = resolveUploadsRootDir();
  const tmpDir = resolveTmpOptimizeDir();
  const srcStat = await fs.promises.stat(params.sourcePath);
  const originalSizeBytes = srcStat.size;
  const sourceBuffer = await fs.promises.readFile(params.sourcePath);

  const meta = await sharp(sourceBuffer).metadata();
  const rawW = meta.width || 0;
  const rawH = meta.height || 0;
  if (!rawW || !rawH) {
    throw new Error(`El archivo "${params.originalName}" no es una imagen válida.`);
  }

  const slug = sanitizeSlugName(params.originalName);
  const finalFilename = `gal-${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${slug}.webp`;
  const finalPath = path.join(uploadsDir, finalFilename);

  const engine = await detectWebpEngine();
  const tempFilesToClean: string[] = [];

  try {
    const srcExt = path.extname(params.sourcePath).toLowerCase();
    const needsExifRotate = meta.orientation !== undefined && meta.orientation !== 1;
    const needsResize = rawW > MAX_DIMENSION_PX || rawH > MAX_DIMENSION_PX;
    const cwebpDirectInput =
      engine === 'cwebp' &&
      !needsExifRotate &&
      !needsResize &&
      ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff'].includes(srcExt);

    if (engine === 'cwebp') {
      let cwebpInputPath = params.sourcePath;
      if (!cwebpDirectInput) {
        const normalizedTmp = path.join(
          tmpDir,
          `norm-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.png`
        );
        await sharp(sourceBuffer)
          .rotate()
          .resize(MAX_DIMENSION_PX, MAX_DIMENSION_PX, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .png({ compressionLevel: 2 })
          .toFile(normalizedTmp);
        tempFilesToClean.push(normalizedTmp);
        cwebpInputPath = normalizedTmp;
      }

      await execFileAsync(
        'cwebp',
        ['-quiet', '-q', String(WEBP_QUALITY), '-m', '6', '-mt', cwebpInputPath, '-o', finalPath],
        { timeout: 30000 }
      );
    } else {
      await sharp(sourceBuffer)
        .rotate()
        .resize(MAX_DIMENSION_PX, MAX_DIMENSION_PX, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY, effort: 6 })
        .toFile(finalPath);
    }

    // Verificar que el .webp exista y no esté corrupto antes de eliminar el original
    const outStat = await fs.promises.stat(finalPath);
    if (!outStat.isFile() || outStat.size < 16) {
      throw new Error('El archivo WebP generado resultó vacío.');
    }

    const outBuffer = await fs.promises.readFile(finalPath);
    const finalMeta = await sharp(outBuffer).metadata();
    const finalWidth = Math.max(1, finalMeta.width || rawW);
    const finalHeight = Math.max(1, finalMeta.height || rawH);

    // Eliminar permanentemente el archivo fuente sin optimizar tras generar el WebP
    await fs.promises.unlink(params.sourcePath);

    const suggested = suggestGallerySpanForImage(finalWidth, finalHeight, 4, false);
    const item = await addStoredMediaItem({
      filename: finalFilename,
      originalName: params.originalName,
      url: `/uploads/${finalFilename}`,
      mimeType: 'image/webp',
      width: finalWidth,
      height: finalHeight,
      sizeBytes: outStat.size,
      originalSizeBytes,
      source: params.source,
      showInGallery: Boolean(params.showInGallery),
      gridSpan: suggested.presetId,
      displayOrder: 0,
      title: params.title?.trim() || humanTitleFromName(params.originalName),
    });

    const savingPercent =
      originalSizeBytes > 0
        ? Math.max(0, Math.round(((originalSizeBytes - outStat.size) / originalSizeBytes) * 100))
        : 0;

    return {
      item,
      engine,
      originalSizeBytes,
      compressedSizeBytes: outStat.size,
      savingPercent,
    };
  } catch (err) {
    // Limpiar WebP incompleto si falló antes de borrar original
    await fs.promises.unlink(finalPath).catch(() => {});
    throw err;
  } finally {
    for (const tmp of tempFilesToClean) {
      await fs.promises.unlink(tmp).catch(() => {});
    }
  }
}

/**
 * Escanea la bandeja FTP (`uploads/ftp-inbox`), optimiza con Google WebP cada foto nueva
 * y elimina automáticamente el archivo original de la bandeja al terminar.
 */
export async function syncFtpInboxToGallery(): Promise<FtpSyncResult> {
  if (ftpSyncInFlight) {
    return ftpSyncInFlight;
  }

  ftpSyncInFlight = (async () => {
    const inboxDir = resolveFtpInboxDir();
    const engine = await detectWebpEngine();
    const processed: StoredMediaItem[] = [];
    const errors: string[] = [];
    let skippedPending = 0;

    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(inboxDir, { withFileTypes: true });
    } catch {
      return { processed, skippedPending, errors, engine };
    }

    const now = Date.now();
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const name = entry.name;
      if (name.startsWith('.') || name.endsWith('.part') || name.endsWith('.tmp') || name.endsWith('.filepart')) {
        continue;
      }

      const ext = path.extname(name).toLowerCase();
      if (!PROCESSABLE_IMAGE_EXTENSIONS.has(ext)) {
        continue;
      }

      const fullPath = path.join(inboxDir, name);
      try {
        const stat = await fs.promises.stat(fullPath);
        // Evitar procesar un archivo que aún se está transfiriendo por FTP/FileZilla
        if (now - stat.mtimeMs < 1200 || stat.size === 0) {
          skippedPending++;
          continue;
        }

        const res = await optimizeFileToWebpAndDeleteOriginal({
          sourcePath: fullPath,
          originalName: name,
          source: 'ftp',
          showInGallery: false,
        });
        processed.push(res.item);
      } catch (err: any) {
        errors.push(`${name}: ${err?.message || 'Error al optimizar'}`);
      }
    }

    return { processed, skippedPending, errors, engine };
  })();

  try {
    return await ftpSyncInFlight;
  } finally {
    ftpSyncInFlight = null;
  }
}

export async function ensureGalleryLibraryReady(): Promise<{
  scannedExisting: number;
  ftpSync: FtpSyncResult;
}> {
  const scannedExisting = await scanExistingUploadsIntoMediaLibrary(probeImageDimensionsWithSharp);
  const ftpSync = await syncFtpInboxToGallery();
  return { scannedExisting, ftpSync };
}
