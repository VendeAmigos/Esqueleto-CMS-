import {
  db,
  discountCodes,
  sql,
  isDatabaseAvailable,
  getStoredCategories,
  getStoredProducts,
  getStoredOrders,
} from '@esqueleto/core';
import Link from 'next/link';
import CategoryGridManager from './categorias/CategoryGridManager';
import { seedSampleOrdersAction } from './ordenes/actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const [storedCats, storedProds, storedOrders, dbOnline] = await Promise.all([
    getStoredCategories(),
    getStoredProducts(true),
    getStoredOrders(),
    isDatabaseAvailable(),
  ]);

  const productsCount = storedProds.length;
  const categoriesCount = storedCats.length;
  const ordersCount = storedOrders.length;
  let couponsCount = 3;

  if (dbOnline) {
    try {
      const couponsResult = await db
        .select({ value: sql<number>`count(*)` })
        .from(discountCodes);
      couponsCount = Number(couponsResult[0]?.value || 0);
    } catch {
      // Fallback local
    }
  }

  // Métricas gráficas de pedidos e ingresos
  const paidOrShippedOrders = storedOrders.filter(
    (o) => o.status === 'paid' || o.status === 'shipped'
  );
  const totalRevenueCents = paidOrShippedOrders.reduce(
    (acc, o) => acc + (Number(o.total) || 0),
    0
  );
  const avgTicketCents =
    paidOrShippedOrders.length > 0
      ? Math.round(totalRevenueCents / paidOrShippedOrders.length)
      : 0;

  const statusCounts = {
    paid: storedOrders.filter((o) => o.status === 'paid').length,
    shipped: storedOrders.filter((o) => o.status === 'shipped').length,
    pending: storedOrders.filter((o) => o.status === 'pending').length,
    cancelled: storedOrders.filter((o) => o.status === 'cancelled').length,
  };

  // Gráfica de barras de los últimos 7 días
  const now = new Date();
  const last7Days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - idx));
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
    const dayOrders = storedOrders.filter((o) => {
      const createdDate = new Date(o.createdAt).toISOString().slice(0, 10);
      return createdDate === key && o.status !== 'cancelled';
    });
    const revenueMxn =
      dayOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0) / 100;
    return {
      key,
      label,
      ordersCount: dayOrders.length,
      revenueMxn,
    };
  });

  const maxDailyRevenue = Math.max(...last7Days.map((d) => d.revenueMxn), 100);

  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
            Centro de Control E-Commerce
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-1">
            Dashboard Gráfico de Ventas & Catálogo
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitorea ingresos, estado de pedidos, productos activos y edita el layout 2D de categorías.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {storedOrders.length === 0 && (
            <form
              action={async () => {
                'use server';
                await seedSampleOrdersAction();
              }}
            >
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
              >
                + Cargar Pedidos Demo para Gráficas
              </button>
            </form>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {dbOnline ? 'PostgreSQL + Local Sync Activo' : 'Modo Local Sincronizado Activo'}
          </span>
        </div>
      </div>

      {/* 1. TARJETAS KPI PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/ordenes"
          className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white p-6 shadow-sm hover:border-emerald-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Ventas Confirmadas
            </h2>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              MXN
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            ${(totalRevenueCents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-emerald-700 font-semibold mt-1 inline-block">
            Ticket prom: ${(avgTicketCents / 100).toFixed(2)} MXN &rarr;
          </span>
        </Link>

        <Link
          href="/ordenes"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-black transition-all group"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 group-hover:text-black">
              Pedidos Totales
            </h2>
            <span className="text-xs font-bold text-indigo-600">{ordersCount} órdenes</span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{ordersCount}</p>
          <span className="text-xs text-indigo-600 font-medium mt-1 inline-block">
            {statusCounts.paid + statusCounts.shipped} aprobados • {statusCounts.pending} pendientes &rarr;
          </span>
        </Link>

        <Link
          href="/productos"
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-black transition-all group"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 group-hover:text-black">
              Catálogo de Productos
            </h2>
            <span className="text-xs font-bold text-amber-600">CSV / Edición</span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{productsCount}</p>
          <span className="text-xs text-gray-600 font-medium mt-1 inline-block">
            Edición individual y carga masiva &rarr;
          </span>
        </Link>

        <Link
          href="/pagos"
          className="rounded-2xl border border-sky-200 bg-sky-50/40 p-6 shadow-sm hover:border-sky-500 transition-all group"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-sky-900">
              Pasarela & Cupones
            </h2>
            <span className="text-xs font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
              Checkout Pro
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-sky-950">Mercado Pago</p>
          <span className="text-xs text-sky-700 font-semibold mt-2 inline-block">
            {couponsCount} cupones • Configurar llaves &rarr;
          </span>
        </Link>
      </div>

      {/* 2. SECCIÓN GRÁFICA DE PEDIDOS E INGRESOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfica de Barras: Ingresos y Pedidos últimos 7 días */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                Tendencia Semanal
              </span>
              <h3 className="text-lg font-extrabold text-gray-900">
                Ingresos y Pedidos (Últimos 7 Días)
              </h3>
            </div>
            <Link
              href="/ordenes"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Ver todos los pedidos &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-3 items-end h-52 pt-6 px-2">
            {last7Days.map((day) => {
              const heightPercent = Math.max(
                day.revenueMxn > 0 ? Math.round((day.revenueMxn / maxDailyRevenue) * 100) : 6,
                6
              );
              return (
                <div
                  key={day.key}
                  className="flex flex-col items-center justify-end h-full group"
                >
                  <div className="text-[10px] font-mono font-bold text-gray-700 mb-1 opacity-85 group-hover:opacity-100">
                    {day.revenueMxn > 0 ? `$${Math.round(day.revenueMxn)}` : '$0'}
                  </div>
                  <div className="w-full max-w-[44px] bg-gray-100 rounded-t-xl h-36 flex items-end overflow-hidden p-0.5">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        day.revenueMxn > 0
                          ? 'bg-gradient-to-t from-indigo-600 to-pink-500 group-hover:opacity-90'
                          : 'bg-gray-200'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 mt-2 capitalize">
                    {day.label}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {day.ordersCount} {day.ordersCount === 1 ? 'ped.' : 'peds.'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribución Gráfica por Estado de Orden + Últimos Pedidos */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="border-b border-gray-100 pb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Embudo Operativo
            </span>
            <h3 className="text-lg font-extrabold text-gray-900">
              Estado de Pedidos & Entregas
            </h3>
          </div>

          <div className="space-y-3.5">
            {[
              {
                label: 'Pagados (Listos para preparar)',
                count: statusCounts.paid,
                color: 'bg-emerald-500',
                badge: 'bg-emerald-50 text-emerald-800',
              },
              {
                label: 'Enviados al Domicilio',
                count: statusCounts.shipped,
                color: 'bg-indigo-600',
                badge: 'bg-indigo-50 text-indigo-800',
              },
              {
                label: 'Pendientes de Pago (Checkout)',
                count: statusCounts.pending,
                color: 'bg-amber-500',
                badge: 'bg-amber-50 text-amber-800',
              },
              {
                label: 'Cancelados',
                count: statusCounts.cancelled,
                color: 'bg-red-500',
                badge: 'bg-red-50 text-red-800',
              },
            ].map((row) => {
              const pct =
                ordersCount > 0 ? Math.round((row.count / ordersCount) * 100) : 0;
              return (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">{row.label}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${row.badge}`}>
                      {row.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${row.color}`}
                      style={{ width: `${Math.max(pct, row.count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lista rápida de los 3 pedidos más recientes */}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Últimos Pedidos Recibidos
            </div>
            {storedOrders.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">
                Aún no hay pedidos. Haz clic en "+ Cargar Pedidos Demo" arriba para previsualizar el flujo.
              </p>
            ) : (
              storedOrders.slice(0, 3).map((ord) => (
                <div
                  key={ord.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs"
                >
                  <div className="truncate pr-2">
                    <span className="font-bold text-gray-900">
                      {ord.customerName || 'Cliente'}
                    </span>
                    <span className="text-gray-400 text-[11px] truncate inline-flex items-center gap-1 max-w-full">
                      <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span className="truncate">
                        {ord.shippingMunicipality || ord.shippingCity || 'Envío nacional'} •{' '}
                        {ord.itemsSummary || 'Artículos'}
                      </span>
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-gray-900 block">
                      ${(Number(ord.total || 0) / 100).toFixed(2)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ord.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'shipped'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ord.status === 'paid'
                        ? 'Pagado'
                        : ord.status === 'shipped'
                        ? 'Enviado'
                        : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. EDITOR VISUAL DE GRID DE CATEGORÍAS */}
      <section className="pt-4 border-t border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              Bento Grid 2D Interactivo
            </span>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-1">
              Editor Libre de Categorías en Grid
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
