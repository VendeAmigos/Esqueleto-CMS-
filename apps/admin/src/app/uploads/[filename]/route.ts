import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = path.basename(params.filename);

  const rootUploads = path.resolve(process.cwd(), '..', '..', 'uploads', filename);
  const localUploads = path.resolve(process.cwd(), 'uploads', filename);

  const filePath = fs.existsSync(rootUploads) ? rootUploads : localUploads;

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Imagen no encontrada', { status: 404 });
  }

  const fileBuffer = await fs.promises.readFile(filePath);
  const ext = filename.split('.').pop()?.toLowerCase();

  let contentType = 'image/webp';
  if (ext === 'png') contentType = 'image/png';
  else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
  else if (ext === 'gif') contentType = 'image/gif';
  else if (ext === 'svg') contentType = 'image/svg+xml';

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
