import { db, products, orders, categories, discountCodes } from '@esqueleto/core';
import { sql } from 'drizzle-orm';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  let productsCount = 0;
  let ordersCount = 0;
  let categoriesCount = 0;
  let couponsCount = 0;

  try {
    const [productsResult, ordersResult, categoriesResult, couponsResult] = await Promise.all([
      db.select({ value: sql<number>`count(*)` }).from(products),
      db.select({ value: sql<number>`count(*)` }).from(orders),
      db.select({ value: sql<number>`count(*)` }).from(categories),
      db.select({ value: sql<number>`count(*)` }).from(discountCodes),
    ]);

    productsCount = Number(productsResult[0]?.value || 0);
    ordersCount = Number(ordersResult[0]?.value || 0);
    categoriesCount = Number(categoriesResult[0]?.value || 0);
    couponsCount = Number(couponsResult[0]?.value || 0);
  } catch (error) {
    console.error("Error conectando a la base de datos:", error);
  }

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Panel de Administración
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Gestión local e independiente del catálogo, modificadores y órdenes con PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Base de Datos PostgreSQL Activa
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

        <Link
          href="/categorias"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-black transition-all group"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 group-hover:text-black">
              Categorías & Layout
            </h2>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="mt-2 text-4xl font-extrabold text-gray-900">{categoriesCount}</p>
          <span className="text-xs text-gray-400 mt-1 inline-block">
            Bento Grid configurable
          </span>
        </Link>
      </div>
    </main>
  );
}
