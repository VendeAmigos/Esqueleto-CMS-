import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getStoredGalleryColumns, getStoredMediaItems } from '@esqueleto/core';
import { detectWebpEngine, ensureGalleryLibraryReady } from '@/lib/webpOptimizer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const syncInfo = await ensureGalleryLibraryReady();
    const [items, columns, engine] = await Promise.all([
      getStoredMediaItems(),
      getStoredGalleryColumns(),
      detectWebpEngine(),
    ]);

    return NextResponse.json({
      success: true,
      items,
      columns,
      optimizerEngine: engine,
      ftpSyncedCount: syncInfo.ftpSync.processed.length,
      ftpPendingCount: syncInfo.ftpSync.skippedPending,
      scannedExisting: syncInfo.scannedExisting,
    });
  } catch (error: any) {
    console.error('Error leyendo galería multimedia:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al consultar la galería' },
      { status: 500 }
    );
  }
}
