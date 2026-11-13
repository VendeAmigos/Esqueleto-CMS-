import { getStoredOrders } from '@esqueleto/core';
import Link from 'next/link';
import OrdersTable from './OrdersTable';
import { seedSampleOrdersAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OrdenesPage() {
  const allOrders = await getStoredOrders();

  const paidOrShipped = allOrders.filter((o) => o.status === 'paid' || o.status === 'shipped');
  const totalRevenueMxn = paidOrShipped.reduce((acc, o) => acc + (Number(o.total) || 0), 0) / 100;
  const pendingCount = allOrders.filter((o) => o.status === 'pending').length;
  const shippedCount = allOrders.filter((o) => o.status === 'shipped').length;

  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Registro de Órdenes & Envíos ({allOrders.length})
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Visualiza las órdenes con dirección obligatoria, WhatsApp, mapa GPS y estado sincronizado con el Webhook de Mercado Pago.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <form
            action={async () => {
              'use server';
              await seedSampleOrdersAction();
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold transition-colors"
            >
              + Generar 3 Pedidos Demo para Gráficas
            </button>
          </form>
          <Link href="/" className="text-gray-700 hover:text-black font-semibold text-xs bg-white border border-gray-300 px-4 py-2 rounded-xl">
            &larr; Ver Dashboard Gráfico
          </Link>
        </div>
      </div>

      {/* KPIs rápidos de Órdenes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Ingresos Confirmados
          </span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            ${totalRevenueMxn.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </p>
          <span className="text-[11px] text-gray-500">
            {paidOrShipped.length} pedido(s) pagados / enviados
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Por Cobrar / Pendientes
          </span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{pendingCount}</p>
          <span className="text-[11px] text-gray-500">Esperando confirmación de pago</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Enviados / Entregados
          </span>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">{shippedCount}</p>
          <span className="text-[11px] text-gray-500">Con dirección verificada</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Total Histórico
          </span>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{allOrders.length}</p>
          <span className="text-[11px] text-gray-500">Órdenes registradas en sistema</span>
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
            <p className="mt-1 text-sm text-gray-500 max-w-md">
              Las órdenes se guardan automáticamente con la dirección del cliente al iniciar el Checkout, o puedes hacer clic arriba en <strong>"+ Generar 3 Pedidos Demo"</strong> para probar las gráficas.
            </p>
          </div>
        ) : (
          <OrdersTable orders={allOrders} />
        )}
      </div>
    </main>
  );
}
