import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import {
  optimizeFileToWebpAndDeleteOriginal,
  resolveTmpOptimizeDir,
} from '@/lib/webpOptimizer';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB origen antes de optimización WebP
const MAX_BATCH_FILES = 50;

const ALLOWED_INPUT_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
};

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado. Inicia sesión como administrador.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const rawList = formData.getAll('files');
    const single = formData.get('file');
    const allFiles = [
      ...rawList.filter((v): v is File => v instanceof File),
      ...(single instanceof File ? [single] : []),
    ];

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: 'No se recibió ninguna imagen para optimizar.' },
        { status: 400 }
      );
    }

    if (allFiles.length > MAX_BATCH_FILES) {
      return NextResponse.json(
        { error: `Máximo ${MAX_BATCH_FILES} imágenes por lote.` },
        { status: 400 }
      );
    }

    const showInGallery = formData.get('showInGallery') === 'true';
    const tmpDir = resolveTmpOptimizeDir();
    const uploadedResults: Array<{
      item: any;
      engine: string;
      originalSizeBytes: number;
      compressedSizeBytes: number;
      savingPercent: number;
    }> = [];
    const errors: string[] = [];

    for (const file of allFiles) {
      const mime = (file.type || '').toLowerCase();
      const extFromName = path.extname(file.name || '').toLowerCase().replace('.', '');
      const safeExt =
        ALLOWED_INPUT_MIME_TO_EXT[mime] ||
        (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp', 'tiff'].includes(extFromName)
          ? extFromName
          : '');

      if (!safeExt) {
        errors.push(`${file.name}: formato no soportado (${mime || extFromName || 'desconocido'}).`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`${file.name}: excede el límite de 25 MB.`);
        continue;
      }

      const stagingName = `stage-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${safeExt}`;
      const stagingPath = path.join(tmpDir, stagingName);

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.promises.writeFile(stagingPath, buffer);

        // Optimiza hacia WebP y borra inmediatamente el archivo temporal original
        const result = await optimizeFileToWebpAndDeleteOriginal({
          sourcePath: stagingPath,
          originalName: file.name || `imagen.${safeExt}`,
          source: 'web',
          showInGallery,
        });

        uploadedResults.push(result);
      } catch (err: any) {
        await fs.promises.unlink(stagingPath).catch(() => {});
        errors.push(`${file.name}: ${err?.message || 'no se pudo optimizar a WebP'}`);
      }
    }

    revalidatePath('/galeria');

    if (uploadedResults.length === 0) {
      return NextResponse.json(
        { error: errors[0] || 'No se pudo procesar ninguna imagen.', errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      uploadedCount: uploadedResults.length,
      results: uploadedResults,
      items: uploadedResults.map((r) => r.item),
      errors,
    });
  } catch (error: any) {
    console.error('Error en subida múltiple de galería:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al procesar imágenes' },
      { status: 500 }
    );
  }
}
