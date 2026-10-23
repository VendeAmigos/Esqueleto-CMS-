import { db, discountCodes, ensureSchema, desc } from '@esqueleto/core';
import CouponManager from './CouponManager';
import Link from 'next/link';

export const metadata = {
  title: 'Códigos de Descuento | CMS Administrador',
  description: 'Administración de cupones promocionales y descuentos para la tienda.',
};

export default async function CuponesPage() {
  await ensureSchema().catch(() => {});

  let allCoupons: any[] = [];
  try {
    allCoupons = await db
      .select()
      .from(discountCodes)
      .orderBy(desc(discountCodes.createdAt))
      .execute();
  } catch (error) {
    console.error('Error cargando cupones de descuento:', error);
  }

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-5 gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-black transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-black font-semibold">Cupones</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            Códigos de Descuento & Promociones
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Crea promociones por porcentaje (%) o montos fijos en pesos, define topes y compras mínimas para tus compradores.
          </p>
        </div>

        <Link
          href="/"
          className="text-xs font-semibold text-gray-600 hover:text-black transition-colors inline-flex items-center gap-1"
        >
          &larr; Volver al Dashboard
        </Link>
      </div>

      {/* Componente Gestor Interactivo */}
      <CouponManager coupons={allCoupons} />
    </main>
  );
}
