import { getStoredGalleryColumns, getStoredMediaItems } from '@esqueleto/core';
import { detectWebpEngine, ensureGalleryLibraryReady } from '@/lib/webpOptimizer';
import GalleryAdminWorkspace from './GalleryAdminWorkspace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GaleriaAdminPage() {
  const syncInfo = await ensureGalleryLibraryReady();
  const [items, columns, engine] = await Promise.all([
    getStoredMediaItems(),
    getStoredGalleryColumns(),
    detectWebpEngine(),
  ]);

  const rawPublicUrl = process.env.PUBLIC_STOREFRONT_URL || 'https://lunnadecoco.com';
  let hostHint = process.env.FTP_PASV_ADDRESS || 'lunnadecoco.com';
  try {
    if (!process.env.FTP_PASV_ADDRESS) {
      hostHint = new URL(rawPublicUrl).hostname;
    }
  } catch {
    // keep default
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <GalleryAdminWorkspace
        initialItems={items}
        initialColumns={columns}
        initialEngine={engine}
        initialFtpSynced={syncInfo.ftpSync.processed.length}
        ftpHostHint={hostHint}
        ftpUser={process.env.FTP_USER || 'lunnacoco_ftp'}
      />
    </div>
  );
}
