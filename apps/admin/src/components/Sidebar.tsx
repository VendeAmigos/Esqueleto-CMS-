'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { logoutAction } from '@/actions/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // No mostrar el sidebar en la pantalla de inicio de sesión
  if (pathname === '/login') {
    return null;
  }

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logotipo / Marca */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <Link href="/" className="text-xl font-black tracking-tighter text-black uppercase">
          ESQUELETO. <span className="text-gray-400">CMS</span>
        </Link>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        <Link 
          href="/" 
          className={`flex items-center gap-3 px-3 py-2.5 font-medium text-sm transition-colors border ${
            pathname === '/'
              ? 'bg-black text-white border-black'
              : 'text-gray-900 hover:bg-black hover:text-white border-transparent hover:border-black'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </Link>

        <Link 
          href="/productos" 
          className={`flex items-center gap-3 px-3 py-2.5 font-medium text-sm transition-colors border ${
            pathname?.startsWith('/productos')
              ? 'bg-black text-white border-black'
              : 'text-gray-900 hover:bg-black hover:text-white border-transparent hover:border-black'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Productos
        </Link>

        <Link 
          href="/categorias" 
          className={`flex items-center gap-3 px-3 py-2.5 font-medium text-sm transition-colors border ${
            pathname === '/categorias'
              ? 'bg-black text-white border-black'
              : 'text-gray-900 hover:bg-black hover:text-white border-transparent hover:border-black'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Categorías & Grid
        </Link>

        <Link 
          href="/apariencia" 
          className={`flex items-center gap-3 px-3 py-2.5 font-medium text-sm transition-colors border ${
            pathname === '/apariencia'
              ? 'bg-black text-white border-black'
              : 'text-gray-900 hover:bg-black hover:text-white border-transparent hover:border-black'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Diseño & Banner
        </Link>

        <Link 
          href="/ordenes" 
          className={`flex items-center gap-3 px-3 py-2.5 font-medium text-sm transition-colors border ${
            pathname === '/ordenes'
              ? 'bg-black text-white border-black'
              : 'text-gray-900 hover:bg-black hover:text-white border-transparent hover:border-black'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Órdenes
        </Link>
      </nav>

      {/* Pie del Sidebar con Perfil y Botón de Cerrar Sesión */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
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
    </aside>
  );
}
