import Link from 'next/link';

export default function Sidebar() {
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-none font-medium text-sm text-gray-900 hover:bg-black hover:text-white transition-colors border border-transparent hover:border-black"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </Link>

        <Link 
          href="/productos" 
          className="flex items-center gap-3 px-3 py-2.5 rounded-none font-medium text-sm text-gray-900 hover:bg-black hover:text-white transition-colors border border-transparent hover:border-black"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Productos
        </Link>

        <Link 
          href="/categorias" 
          className="flex items-center gap-3 px-3 py-2.5 rounded-none font-medium text-sm text-gray-900 hover:bg-black hover:text-white transition-colors border border-transparent hover:border-black"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Categorías & Grid
        </Link>

        <Link 
          href="/apariencia" 
          className="flex items-center gap-3 px-3 py-2.5 rounded-none font-medium text-sm text-gray-900 hover:bg-black hover:text-white transition-colors border border-transparent hover:border-black"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Diseño & Banner
        </Link>

        <Link 
          href="/ordenes" 
          className="flex items-center gap-3 px-3 py-2.5 rounded-none font-medium text-sm text-gray-900 hover:bg-black hover:text-white transition-colors border border-transparent hover:border-black"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Órdenes
        </Link>
      </nav>

      {/* Pie del Sidebar */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-xs">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">Admin</p>
            <p className="text-xs text-gray-500 truncate">admin@esqueleto.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
