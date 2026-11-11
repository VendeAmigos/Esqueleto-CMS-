import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_IMAGE_MIME: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  avif: 'image/avif',
};

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = path.basename(params.filename || '');
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Bloquear archivos ocultos, JSON o extensiones no permitidas
  if (!filename || filename.startsWith('.') || !ALLOWED_IMAGE_MIME[ext]) {
    return new NextResponse('Archivo no permitido', { status: 403 });
  }

  const rootUploads = path.resolve(process.cwd(), '..', '..', 'uploads', filename);
  const localUploads = path.resolve(process.cwd(), 'uploads', filename);

  const filePath = fs.existsSync(rootUploads) ? rootUploads : localUploads;

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Imagen no encontrada', { status: 404 });
  }

  const fileBuffer = await fs.promises.readFile(filePath);
  const contentType = ALLOWED_IMAGE_MIME[ext];

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
