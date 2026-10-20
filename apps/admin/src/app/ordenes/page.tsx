import { db, orders, ensureSchema } from '@esqueleto/core';
import Link from 'next/link';

export default async function OrdenesPage() {
  try {
    await ensureSchema();
  } catch (e) {}

  let allOrders: any[] = [];
  try {
    allOrders = await db.select().from(orders);
  } catch (e) {
    console.error('Error cargando órdenes:', e);
  }

  // Formateador de moneda nativo (MXN)
  const currencyFormatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Registro de Órdenes
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Visualiza y administra las órdenes con sus modificadores y montos totales procesados por Mercado Pago.
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
              Las órdenes se guardan automáticamente en tu base de datos local en cuanto se genere la sesión o el cliente complete el pago en Mercado Pago.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ID de Orden
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Artículos y Modificadores
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {allOrders.reverse().map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                      <span className="truncate w-28 inline-block" title={order.id}>
                        {order.id.slice(0, 16)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.customerEmail || 'Invitado'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                      {order.itemsSummary ? (
                        <span className="text-xs bg-gray-50 p-1.5 rounded-lg border border-gray-200 block truncate" title={order.itemsSummary}>
                          {order.itemsSummary}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Detalles en Mercado Pago</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {currencyFormatter.format(order.total / 100)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.status === 'paid' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Aprobado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 capitalize">
                          {order.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
