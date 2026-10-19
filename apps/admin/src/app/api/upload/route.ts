import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo de imagen' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ruta de almacenamiento de uploads: compatible con Docker y desarrollo local
    // Si estamos en monorepo local, se almacena en la carpeta uploads de la raíz
    const rootUploads = path.resolve(process.cwd(), '..', '..', 'uploads');
    const localUploads = path.resolve(process.cwd(), 'uploads');
    
    // Si existe la carpeta raíz de monorepo la usamos; si no, la local de la app
    const targetDir = fs.existsSync(path.resolve(process.cwd(), '..', '..'))
      ? rootUploads
      : localUploads;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Nombre seguro con timestamp y hash único
    const ext = file.name.split('.').pop() || 'webp';
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
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
