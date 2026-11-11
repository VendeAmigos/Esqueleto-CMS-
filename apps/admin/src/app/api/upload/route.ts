import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export async function POST(req: NextRequest) {
  try {
    // 1. Defensa en profundidad: Verificar sesión de administrador
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado. Inicia sesión como administrador.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo de imagen' },
        { status: 400 }
      );
    }

    // 2. Validar tipo MIME permitido
    const safeExt = ALLOWED_MIME_TO_EXT[file.type.toLowerCase()];
    if (!safeExt) {
      return NextResponse.json(
        { error: 'Formato de archivo no permitido. Usa imágenes WebP, JPG, PNG, GIF o AVIF.' },
        { status: 400 }
      );
    }

    // 3. Validar tamaño máximo (10 MB)
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'La imagen excede el tamaño máximo permitido de 10 MB.' },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Ruta de almacenamiento compatible con Docker (UPLOADS_DIR) y monorepo local
    const rootUploads = path.resolve(process.cwd(), '..', '..', 'uploads');
    const localUploads = path.resolve(process.cwd(), 'uploads');
    const targetDir = process.env.UPLOADS_DIR
      ? path.resolve(process.env.UPLOADS_DIR)
      : fs.existsSync(path.resolve(process.cwd(), '..', '..'))
        ? rootUploads
        : localUploads;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 5. Nombre seguro con timestamp, hash criptográfico y extensión estricta
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${safeExt}`;
    const destination = path.join(targetDir, filename);

    await fs.promises.writeFile(destination, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${filename}`,
      filename,
      size: buffer.length,
    });
  } catch (error: any) {
    console.error('Error al subir imagen:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al guardar la imagen' },
      { status: 500 }
    );
  }
}
