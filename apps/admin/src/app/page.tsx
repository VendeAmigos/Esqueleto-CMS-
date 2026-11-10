import {
  db,
  orders,
  discountCodes,
  sql,
  isDatabaseAvailable,
  getStoredCategories,
  getStoredProducts,
} from '@esqueleto/core';
import Link from 'next/link';
import CategoryGridManager from './categorias/CategoryGridManager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const [storedCats, storedProds, dbOnline] = await Promise.all([
    getStoredCategories(),
    getStoredProducts(),
    isDatabaseAvailable(),
  ]);

  const productsCount = storedProds.length;
  const categoriesCount = storedCats.length;
  let ordersCount = 0;
  let couponsCount = 3;

  if (dbOnline) {
    try {
      const [ordersResult, couponsResult] = await Promise.all([
        db.select({ value: sql<number>`count(*)` }).from(orders),
        db.select({ value: sql<number>`count(*)` }).from(discountCodes),
      ]);
      ordersCount = Number(ordersResult[0]?.value || 0);
      couponsCount = Number(couponsResult[0]?.value || 0);
    } catch (error) {
      console.warn('Usando conteos locales en Dashboard:', error);
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-10">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Panel de Administración
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Gestión visual del catálogo, layout en Grid (estilo CSS Grid Generator), modificadores y órdenes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {dbOnline ? 'PostgreSQL Activo' : 'Modo Local Sincronizado Activo'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/productos"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-black transition-all group"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 group-hover:text-black">
              Productos y Modificadores
            </h2>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="mt-2 text-4xl font-extrabold text-gray-900">{productsCount}</p>
          <span className="text-xs text-indigo-600 font-medium mt-1 inline-block">
            Precios y opciones editables &rarr;
          </span>
        </Link>

        <Link
          href="/categorias"
          className="rounded-2xl border-2 border-indigo-500 bg-indigo-50/40 p-6 shadow-sm hover:bg-indigo-50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-indigo-900">
              Categorías & CSS Grid
            </h2>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="mt-2 text-4xl font-extrabold text-indigo-950">{categoriesCount}</p>
          <span className="text-xs text-indigo-700 font-bold mt-1 inline-block">
            Drag & Drop estilo cssgridgenerator.io &rarr;
          </span>
        </Link>

        <Link
          href="/cupones"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-black transition-all group"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 group-hover:text-black">
              Cupones de Descuento
            </h2>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
          </div>
          <p className="mt-2 text-4xl font-extrabold text-gray-900">{couponsCount}</p>
          <span className="text-xs text-amber-600 font-medium mt-1 inline-block">
            Promociones activas &rarr;
          </span>
        </Link>

        <Link
          href="/ordenes"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-black transition-all group"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 group-hover:text-black">
              Órdenes Registradas
            </h2>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="mt-2 text-4xl font-extrabold text-gray-900">{ordersCount}</p>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">
            Sincronizado Mercado Pago
          </span>
        </Link>
      </div>

      {/* Editor Visual de Grid de Categorías directamente accesible en el Dashboard */}
      <section className="pt-4 border-t border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              CSS Grid Generator Interactivo
            </span>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-1">
              Editor Drag & Drop de Categorías en Grid
            </h2>
          </div>
          <Link
            href="/categorias"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            Abrir en pantalla completa &rarr;
          </Link>
        </div>

        <CategoryGridManager categories={storedCats} />
      </section>
    </main>
  );
}
