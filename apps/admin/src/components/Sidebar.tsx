'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { logoutAction } from '@/actions/auth';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    exact: true,
    iconPath:
      'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    href: '/productos',
    label: 'Productos',
    exact: false,
    iconPath:
      'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  },
  {
    href: '/categorias',
    label: 'Categorías & Grid',
    exact: true,
    iconPath: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  },
  {
    href: '/apariencia',
    label: 'Diseño & Banner',
    exact: true,
    iconPath: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    href: '/cupones',
    label: 'Cupones & Descuentos',
    exact: false,
    iconPath: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  },
  {
    href: '/ordenes',
    label: 'Órdenes',
    exact: true,
    iconPath: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  },
  {
    href: '/pagos',
    label: 'Pasarela de Pagos',
    exact: false,
    iconPath: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  // No mostrar el sidebar en la pantalla de inicio de sesión
  if (pathname === '/login') {
    return null;
  }

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const renderLinks = () =>
    NAV_ITEMS.map((item) => {
      const isActive = item.exact
        ? pathname === item.href
        : Boolean(pathname?.startsWith(item.href));
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 font-medium text-sm transition-colors border ${
            isActive
              ? 'bg-black text-white border-black'
              : 'text-gray-900 hover:bg-black hover:text-white border-transparent hover:border-black'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d={item.iconPath} />
          </svg>
          <span>{item.label}</span>
        </Link>
      );
    });

  const renderFooter = () => (
    <div className="p-4 border-t border-gray-200 space-y-3">
      <div className="flex items-center gap-3 px-2 py-1">
        <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
          AD
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">Administrador</p>
          <p className="text-[11px] text-emerald-600 font-medium truncate flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Sesión Segura
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200 active:scale-[0.98] disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>{isPending ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Barra superior móvil (< 1024px) */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 h-14 px-4 flex items-center justify-between shrink-0">
        <Link href="/" className="text-lg font-black tracking-tighter text-black uppercase">
          ESQUELETO. <span className="text-gray-400">CMS</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú de administración"
          aria-expanded={mobileOpen}
          className="p-2 rounded-lg border border-gray-200 text-gray-800 hover:bg-gray-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Drawer móvil */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl border-r border-gray-200">
            <div className="h-14 flex items-center justify-between px-5 border-b border-gray-200">
              <span className="text-lg font-black tracking-tighter text-black uppercase">
                ESQUELETO. <span className="text-gray-400">CMS</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">{renderLinks()}</nav>
            {renderFooter()}
          </aside>
        </div>
      )}

      {/* Sidebar fijo Desktop (>= 1024px) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col h-screen sticky top-0 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/" className="text-xl font-black tracking-tighter text-black uppercase">
            ESQUELETO. <span className="text-gray-400">CMS</span>
          </Link>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">{renderLinks()}</nav>
        {renderFooter()}
      </aside>
    </>
  );
}
