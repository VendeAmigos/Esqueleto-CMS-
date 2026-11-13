import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_SEED_MIME: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = path.basename(params.filename || '');
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (!filename || filename.startsWith('.') || !ALLOWED_SEED_MIME[ext]) {
    return new NextResponse('Archivo no permitido', { status: 403 });
  }

  const candidatePaths = [
    path.resolve(process.cwd(), 'public', 'seed', filename),
    path.resolve(process.cwd(), 'apps', 'admin', 'public', 'seed', filename),
    path.resolve(process.cwd(), '..', 'storefront', 'public', 'seed', filename),
    path.resolve(process.cwd(), 'apps', 'storefront', 'public', 'seed', filename),
  ];

  const filePath = candidatePaths.find((candidate) => fs.existsSync(candidate));
  if (!filePath) {
    return new NextResponse('Imagen seed no encontrada', { status: 404 });
  }

  const fileBuffer = await fs.promises.readFile(filePath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': ALLOWED_SEED_MIME[ext],
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

