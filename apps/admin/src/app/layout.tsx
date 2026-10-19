import type { Metadata } from 'next';
import './globals.css';

import Sidebar from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Panel de Administración | ESQUELETO',
  description: 'Panel de control y gestión de catálogo para administradores',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex">
        <Sidebar />
        <main className="flex-1 bg-gray-50 min-h-screen overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
