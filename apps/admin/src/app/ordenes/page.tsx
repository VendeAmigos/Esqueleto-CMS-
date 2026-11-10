import { db, orders, desc, isDatabaseAvailable } from '@esqueleto/core';
import Link from 'next/link';
import OrdersTable from './OrdersTable';

export const dynamic = 'force-dynamic';

export default async function OrdenesPage() {
  let allOrders: any[] = [];
  if (await isDatabaseAvailable()) {
    try {
      allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    } catch (e) {
      console.error('Error cargando órdenes:', e);
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Registro de Órdenes & Envíos
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Visualiza las órdenes con sus datos de envío, teléfono/WhatsApp, coordenadas exactas y cobro procesado por Mercado Pago.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4 text-sm">
          <Link href="/" className="text-gray-600 hover:text-black font-semibold">
            &larr; Volver al Dashboard
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {allOrders.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Aún no hay órdenes registradas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Las órdenes se guardan automáticamente con la dirección del cliente en cuanto se inicie el pago.
            </p>
          </div>
        ) : (
          <OrdersTable orders={allOrders} />
        )}
      </div>
    </main>
  );
}
