import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

export const GET: APIRoute = async ({ params }) => {
  const filename = path.basename(params.filename || '');

  const rootUploads = path.resolve(process.cwd(), '..', '..', 'uploads', filename);
  const localUploads = path.resolve(process.cwd(), 'uploads', filename);

  const filePath = fs.existsSync(rootUploads) ? rootUploads : localUploads;

  if (!fs.existsSync(filePath)) {
    return new Response('Imagen no encontrada', { status: 404 });
  }

  const fileBuffer = await fs.promises.readFile(filePath);
  const ext = filename.split('.').pop()?.toLowerCase();

  let contentType = 'image/webp';
  if (ext === 'png') contentType = 'image/png';
  else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
  else if (ext === 'gif') contentType = 'image/gif';
  else if (ext === 'svg') contentType = 'image/svg+xml';

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
