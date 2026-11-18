import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { syncFtpInboxToGallery } from '@/lib/webpOptimizer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const syncResult = await syncFtpInboxToGallery();
    revalidatePath('/galeria');

    return NextResponse.json({
      success: true,
      processedCount: syncResult.processed.length,
      processed: syncResult.processed,
      skippedPending: syncResult.skippedPending,
      errors: syncResult.errors,
      engine: syncResult.engine,
    });
  } catch (error: any) {
    console.error('Error sincronizando bandeja FTP:', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo procesar la bandeja FTP' },
      { status: 500 }
    );
  }
}
