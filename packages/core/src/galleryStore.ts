import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db, isDatabaseAvailable, markDatabaseOffline, ensureSchema, eq, desc } from './index';
import { mediaItems, gallerySettings } from './schema';
import { normalizeGalleryColumns, type GalleryColumnCount } from './grid';

export type MediaSourceKind = 'web' | 'ftp' | 'existing';

export interface StoredMediaItem {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  originalSizeBytes: number;
  source: MediaSourceKind;
  showInGallery: boolean;
  gridSpan: string;
  displayOrder: number;
  title: string | null;
  createdAt: string;
}

export interface StoredGalleryConfig {
  columns: GalleryColumnCount;
  updatedAt: string;
}

const IMAGE_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.gif', '.avif']);

export function resolveUploadsRootDir(): string {
  const cwd = process.cwd();
  const candidates = [
    process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : '',
    path.resolve(cwd, 'uploads'),
    path.resolve(cwd, '../../uploads'),
    path.resolve(cwd, '../uploads'),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  const fallback = path.resolve(cwd, 'uploads');
  try {
    fs.mkdirSync(fallback, { recursive: true });
  } catch {
    // ignore
  }
  return fallback;
}

function getCmsDataDir(): string {
  const cmsDir = path.join(resolveUploadsRootDir(), '.cms-data');
  if (!fs.existsSync(cmsDir)) {
    fs.mkdirSync(cmsDir, { recursive: true });
  }
  return cmsDir;
}

export function resolveFtpInboxDir(): string {
  const inbox = path.join(resolveUploadsRootDir(), 'ftp-inbox');
  if (!fs.existsSync(inbox)) {
    fs.mkdirSync(inbox, { recursive: true });
  }
  return inbox;
}

function getMediaJsonPath(): string {
  return path.join(getCmsDataDir(), 'gallery-media.json');
}

function getGalleryConfigPath(): string {
  return path.join(getCmsDataDir(), 'gallery-config.json');
}

function readLocalMediaItems(): StoredMediaItem[] {
  const filePath = getMediaJsonPath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeMediaRecord);
      }
    }
  } catch (err) {
    console.warn('Error leyendo gallery-media.json local:', err);
  }
  return [];
}

function writeLocalMediaItems(items: StoredMediaItem[]): void {
  const filePath = getMediaJsonPath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error escribiendo gallery-media.json local:', err);
  }
}

function readLocalGalleryConfig(): StoredGalleryConfig {
  const filePath = getGalleryConfigPath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        columns: normalizeGalleryColumns(Number(parsed?.columns)),
        updatedAt: parsed?.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('Error leyendo gallery-config.json local:', err);
  }
  return { columns: 4, updatedAt: new Date().toISOString() };
}

function writeLocalGalleryConfig(cfg: StoredGalleryConfig): void {
  const filePath = getGalleryConfigPath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error guardando gallery-config.json local:', err);
  }
}

function normalizeMediaRecord(raw: any): StoredMediaItem {
  const created = raw?.createdAt instanceof Date
    ? raw.createdAt.toISOString()
    : typeof raw?.createdAt === 'string' && raw.createdAt
      ? raw.createdAt
      : new Date().toISOString();

  const src: MediaSourceKind =
    raw?.source === 'ftp' || raw?.source === 'existing' ? raw.source : 'web';

  return {
    id: String(raw?.id || crypto.randomUUID()),
    filename: String(raw?.filename || path.basename(String(raw?.url || 'imagen.webp'))),
    originalName: String(raw?.originalName || raw?.filename || 'imagen'),
    url: String(raw?.url || ''),
    mimeType: String(raw?.mimeType || 'image/webp'),
    width: Math.max(1, Number(raw?.width) || 800),
    height: Math.max(1, Number(raw?.height) || 800),
    sizeBytes: Math.max(0, Number(raw?.sizeBytes) || 0),
    originalSizeBytes: Math.max(0, Number(raw?.originalSizeBytes) || Number(raw?.sizeBytes) || 0),
    source: src,
    showInGallery: Boolean(raw?.showInGallery),
    gridSpan: String(raw?.gridSpan || '1x1'),
    displayOrder: Number.isFinite(Number(raw?.displayOrder)) ? Number(raw.displayOrder) : 0,
    title: raw?.title ? String(raw.title) : null,
    createdAt: created,
  };
}

/**
 * Obtiene dimensiones mínimas desde cabeceras PNG/JPEG/WebP sin dependencias nativas.
 */
function probeHeaderDimensionsSync(filePath: string): { width: number; height: number } {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(65536);
    const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const slice = buf.subarray(0, bytesRead);

    // PNG
    if (slice.length >= 24 && slice.toString('ascii', 1, 4) === 'PNG') {
      return {
        width: slice.readUInt32BE(16),
        height: slice.readUInt32BE(20),
      };
    }

    // WebP (RIFF....WEBP)
    if (slice.length >= 30 && slice.toString('ascii', 0, 4) === 'RIFF' && slice.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = slice.toString('ascii', 12, 16);
      if (chunk === 'VP8 ' && slice.length >= 30) {
        return {
          width: slice.readUInt16LE(26) & 0x3fff,
          height: slice.readUInt16LE(28) & 0x3fff,
        };
      }
      if (chunk === 'VP8L' && slice.length >= 25) {
        const bits = slice.readUInt32LE(21);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }
      if (chunk === 'VP8X' && slice.length >= 30) {
        const w = (slice[24] | (slice[25] << 8) | (slice[26] << 16)) + 1;
        const h = (slice[27] | (slice[28] << 8) | (slice[29] << 16)) + 1;
        return { width: w, height: h };
      }
    }

    // JPEG SOF0/SOF2
    if (slice.length >= 4 && slice[0] === 0xff && slice[1] === 0xd8) {
      let i = 2;
      while (i + 9 < slice.length) {
        if (slice[i] !== 0xff) break;
        const marker = slice[i + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          return {
            height: slice.readUInt16BE(i + 5),
            width: slice.readUInt16BE(i + 7),
          };
        }
        const len = slice.readUInt16BE(i + 2);
        if (len < 2) break;
        i += 2 + len;
      }
    }
  } catch {
    // ignore fallback
  }
  return { width: 800, height: 800 };
}

export async function getStoredGalleryColumns(): Promise<GalleryColumnCount> {
  const localCfg = readLocalGalleryConfig();
  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      const rows = await db
        .select()
        .from(gallerySettings)
        .where(eq(gallerySettings.id, 'default'))
        .limit(1)
        .execute();
      if (rows[0]) {
        return normalizeGalleryColumns(rows[0].columns);
      }
    } catch (err) {
      markDatabaseOffline();
      console.warn('Fallback leyendo columnas de galería:', err);
    }
  }
  return localCfg.columns;
}

export async function setStoredGalleryColumns(cols: number): Promise<GalleryColumnCount> {
  const normalized = normalizeGalleryColumns(cols);
  const cfg: StoredGalleryConfig = {
    columns: normalized,
    updatedAt: new Date().toISOString(),
  };
  writeLocalGalleryConfig(cfg);

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      const existing = await db
        .select()
        .from(gallerySettings)
        .where(eq(gallerySettings.id, 'default'))
        .limit(1)
        .execute();
      if (existing.length > 0) {
        await db
          .update(gallerySettings)
          .set({ columns: normalized, updatedAt: new Date() })
          .where(eq(gallerySettings.id, 'default'));
      } else {
        await db.insert(gallerySettings).values({ id: 'default', columns: normalized });
      }
    } catch (err) {
      markDatabaseOffline();
      console.warn('Aviso guardando columnas de galería en PostgreSQL:', err);
    }
  }

  return normalized;
}

export async function getStoredMediaItems(options?: { onlyPublic?: boolean }): Promise<StoredMediaItem[]> {
  const hasLocal = fs.existsSync(getMediaJsonPath());
  const localItems = hasLocal ? readLocalMediaItems() : null;
  let result: StoredMediaItem[] = localItems || [];

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      const dbRows = await db
        .select()
        .from(mediaItems)
        .orderBy(desc(mediaItems.createdAt))
        .execute();

      const mergedMap = new Map<string, StoredMediaItem>();
      for (const row of dbRows) {
        mergedMap.set(row.url, normalizeMediaRecord(row));
      }
      if (localItems && localItems.length > 0) {
        for (const loc of localItems) {
          if (!mergedMap.has(loc.url)) {
            mergedMap.set(loc.url, loc);
          } else {
            // Preservar coordenadas recientes si el archivo local fue actualizado por último
            const existing = mergedMap.get(loc.url)!;
            mergedMap.set(loc.url, {
              ...existing,
              showInGallery: loc.showInGallery,
              gridSpan: loc.gridSpan || existing.gridSpan,
              displayOrder: loc.displayOrder ?? existing.displayOrder,
              title: loc.title !== undefined ? loc.title : existing.title,
            });
          }
        }
      }
      result = Array.from(mergedMap.values());
    } catch (err) {
      markDatabaseOffline();
      console.warn('Fallback leyendo media_items local:', err);
    }
  }

  // Filtrar solo archivos existentes cuando son URLs locales /uploads/...
  const uploadsRoot = resolveUploadsRootDir();
  result = result.filter((item) => {
    if (!item.url.startsWith('/uploads/')) return true;
    const filename = path.basename(item.url);
    return fs.existsSync(path.join(uploadsRoot, filename));
  });

  if (options?.onlyPublic) {
    result = result
      .filter((item) => item.showInGallery)
      .sort((a, b) => {
        const orderA = a.displayOrder > 0 ? a.displayOrder : 999999;
        const orderB = b.displayOrder > 0 ? b.displayOrder : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  } else {
    result = result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return result;
}

export async function addStoredMediaItem(
  input: Omit<StoredMediaItem, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): Promise<StoredMediaItem> {
  const current = readLocalMediaItems();
  const maxOrder = current.reduce((max, i) => Math.max(max, i.displayOrder || 0), 0);

  const existingByUrl = current.find((i) => i.url === input.url);
  const record: StoredMediaItem = normalizeMediaRecord({
    ...existingByUrl,
    ...input,
    id: existingByUrl?.id || input.id || `media-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    displayOrder:
      input.displayOrder !== undefined && input.displayOrder > 0
        ? input.displayOrder
        : existingByUrl?.displayOrder || maxOrder + 1,
    createdAt: existingByUrl?.createdAt || input.createdAt || new Date().toISOString(),
  });

  const nextLocal = [record, ...current.filter((i) => i.url !== record.url && i.id !== record.id)];
  writeLocalMediaItems(nextLocal);

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      const existingDb = await db
        .select({ id: mediaItems.id })
        .from(mediaItems)
        .where(eq(mediaItems.url, record.url))
        .limit(1)
        .execute();

      if (existingDb.length > 0) {
        await db
          .update(mediaItems)
          .set({
            filename: record.filename,
            originalName: record.originalName,
            mimeType: record.mimeType,
            width: record.width,
            height: record.height,
            sizeBytes: record.sizeBytes,
            originalSizeBytes: record.originalSizeBytes,
            source: record.source,
            title: record.title,
          })
          .where(eq(mediaItems.id, existingDb[0].id));
      } else {
        await db.insert(mediaItems).values({
          id: record.id,
          filename: record.filename,
          originalName: record.originalName,
          url: record.url,
          mimeType: record.mimeType,
          width: record.width,
          height: record.height,
          sizeBytes: record.sizeBytes,
          originalSizeBytes: record.originalSizeBytes,
          source: record.source,
          showInGallery: record.showInGallery,
          gridSpan: record.gridSpan,
          displayOrder: record.displayOrder,
          title: record.title,
          createdAt: new Date(record.createdAt),
        });
      }
    } catch (err) {
      markDatabaseOffline();
      console.warn('Aviso guardando media_item en PostgreSQL:', err);
    }
  }

  return record;
}

export async function updateStoredMediaItem(
  id: string,
  patch: Partial<Pick<StoredMediaItem, 'showInGallery' | 'gridSpan' | 'displayOrder' | 'title'>>
): Promise<StoredMediaItem | null> {
  const current = await getStoredMediaItems();
  const target = current.find((i) => i.id === id);
  if (!target) return null;

  const updated: StoredMediaItem = {
    ...target,
    ...(patch.showInGallery !== undefined ? { showInGallery: Boolean(patch.showInGallery) } : {}),
    ...(patch.gridSpan !== undefined ? { gridSpan: patch.gridSpan } : {}),
    ...(patch.displayOrder !== undefined ? { displayOrder: patch.displayOrder } : {}),
    ...(patch.title !== undefined ? { title: patch.title } : {}),
  };

  const local = readLocalMediaItems();
  const nextLocal = local.some((i) => i.id === id)
    ? local.map((i) => (i.id === id ? updated : i))
    : [updated, ...local];
  writeLocalMediaItems(nextLocal);

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      await db
        .update(mediaItems)
        .set({
          showInGallery: updated.showInGallery,
          gridSpan: updated.gridSpan,
          displayOrder: updated.displayOrder,
          title: updated.title,
        })
        .where(eq(mediaItems.id, id));
    } catch (err) {
      markDatabaseOffline();
      console.warn('Aviso actualizando media_item en PostgreSQL:', err);
    }
  }

  return updated;
}

export async function bulkUpdateStoredMediaVisibility(
  ids: string[],
  showInGallery: boolean
): Promise<void> {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  const current = await getStoredMediaItems();
  const next = current.map((item) =>
    idSet.has(item.id) ? { ...item, showInGallery } : item
  );
  writeLocalMediaItems(next);

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      for (const id of ids) {
        await db
          .update(mediaItems)
          .set({ showInGallery })
          .where(eq(mediaItems.id, id));
      }
    } catch (err) {
      markDatabaseOffline();
      console.warn('Aviso actualizando visibilidad masiva en PostgreSQL:', err);
    }
  }
}

export async function saveStoredGalleryLayout(
  columns: number,
  updates: { id: string; gridSpan: string; displayOrder: number }[]
): Promise<void> {
  await setStoredGalleryColumns(columns);
  const current = await getStoredMediaItems();
  const updateMap = new Map(updates.map((u) => [u.id, u]));

  const next = current.map((item) => {
    const match = updateMap.get(item.id);
    if (!match) return item;
    return {
      ...item,
      gridSpan: match.gridSpan,
      displayOrder: match.displayOrder,
    };
  });
  writeLocalMediaItems(next);

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      for (const item of updates) {
        await db
          .update(mediaItems)
          .set({
            gridSpan: item.gridSpan,
            displayOrder: item.displayOrder,
          })
          .where(eq(mediaItems.id, item.id));
      }
    } catch (err) {
      markDatabaseOffline();
      console.warn('Aviso guardando layout de galería en PostgreSQL:', err);
    }
  }
}

export async function deleteStoredMediaItem(id: string): Promise<StoredMediaItem | null> {
  const current = await getStoredMediaItems();
  const target = current.find((i) => i.id === id) || null;
  if (!target) return null;

  writeLocalMediaItems(readLocalMediaItems().filter((i) => i.id !== id));

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      await db.delete(mediaItems).where(eq(mediaItems.id, id));
    } catch (err) {
      markDatabaseOffline();
      console.warn('Aviso eliminando media_item en PostgreSQL:', err);
    }
  }

  return target;
}

/**
 * Escanea archivos de imagen existentes en `uploads/` (excluyendo `.cms-data`, `ftp-inbox`, `.tmp-*`)
 * y registra los no indexados con `showInGallery: false` (ocultos hasta que el admin los active).
 */
export async function scanExistingUploadsIntoMediaLibrary(
  probeFn?: (filePath: string) => Promise<{ width: number; height: number } | null>
): Promise<number> {
  const uploadsDir = resolveUploadsRootDir();
  if (!fs.existsSync(uploadsDir)) return 0;

  const existing = await getStoredMediaItems();
  const knownUrls = new Set(existing.map((i) => i.url));

  let added = 0;
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filename = entry.name;
    if (filename.startsWith('.')) continue;
    const ext = path.extname(filename).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;

    const url = `/uploads/${filename}`;
    if (knownUrls.has(url)) continue;

    const fullPath = path.join(uploadsDir, filename);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    let dims = probeHeaderDimensionsSync(fullPath);
    if (probeFn) {
      try {
        const probed = await probeFn(fullPath);
        if (probed && probed.width > 0 && probed.height > 0) {
          dims = probed;
        }
      } catch {
        // use header dims
      }
    }

    const baseTitle = path.basename(filename, ext).replace(/^\d+-[a-f0-9]+-?/i, '').replace(/[-_]+/g, ' ').trim();

    await addStoredMediaItem({
      filename,
      originalName: filename,
      url,
      mimeType: ext === '.webp' ? 'image/webp' : `image/${ext.replace('.', '')}`,
      width: dims.width,
      height: dims.height,
      sizeBytes: stat.size,
      originalSizeBytes: stat.size,
      source: 'existing',
      showInGallery: false,
      gridSpan: '1x1',
      displayOrder: 0,
      title: baseTitle || filename,
      createdAt: (stat.birthtime && stat.birthtime.getTime() > 0 ? stat.birthtime : stat.mtime).toISOString(),
    });
    knownUrls.add(url);
    added++;
  }

  return added;
}
