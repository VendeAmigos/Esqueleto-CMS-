import type { Metadata } from 'next';
import './globals.css';

import Sidebar from '@/components/Sidebar';
import { getStoredSiteSettings, getSvgCacheVersion } from '@esqueleto/core';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getStoredSiteSettings();
    const customFavicon = (settings.faviconUrl || '').trim();
    const hasCustomFavicon = Boolean(customFavicon && customFavicon !== '/favicon.svg');
    const iconUrl = hasCustomFavicon
      ? customFavicon
      : settings.logoSvg?.trim()
        ? `/api/favicon.svg?v=${getSvgCacheVersion(settings.logoSvg, settings.logoColor)}`
        : '/api/favicon.svg';

    return {
      title: `Admin | ${settings.siteName || 'ESQUELETO CMS'}`,
      description: 'Panel de control y gestión de catálogo para administradores',
      icons: {
        icon: iconUrl,
      },
    };
  } catch {
    return {
      title: 'Panel de Administración | ESQUELETO CMS',
      description: 'Panel de control y gestión de catálogo para administradores',
      icons: {
        icon: '/api/favicon.svg',
      },
    };
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col lg:flex-row">
        <Sidebar />
        <main className="flex-1 bg-gray-50 min-h-screen min-w-0 overflow-x-clip">
          {children}
        </main>
      </body>
    </html>
  );
}
