'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeOrderStatusAction } from './actions';

interface OrderItem {
  id: string;
  status: string;
  subtotal: number | null;
  discountCode: string | null;
  discountAmount: number;
  total: number;
  customerEmail: string | null;
  itemsSummary: string | null;
  itemsJson: string | null;
  customerName: string | null;
  customerPhone: string | null;
  shippingStreet: string | null;
  shippingExtNumber: string | null;
  shippingIntNumber: string | null;
  shippingNeighborhood: string | null;
  shippingMunicipality: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  shippingReferences: string | null;
  shippingLat: number | null;
  shippingLng: number | null;
  locationSource: string | null;
  createdAt: string | Date;
}

export default function OrdersTable({ orders }: { orders: OrderItem[] }) {
  const router = useRouter();
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (
    orderId: string,
    nextStatus: 'pending' | 'paid' | 'shipped' | 'cancelled'
  ) => {
    setUpdatingId(orderId);
    await changeOrderStatusAction(orderId, nextStatus);
    setUpdatingId(null);
    router.refresh();
  };

  const currencyFormatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ID / Fecha
              </th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Cliente & Teléfono
              </th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Dirección / Ubicación
              </th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {orders.map((order) => {
              const hasCoords = order.shippingLat != null && order.shippingLng != null;
              const fullAddress = [
                order.shippingStreet ? `${order.shippingStreet} #${order.shippingExtNumber || 'S/N'}${order.shippingIntNumber ? ` Int. ${order.shippingIntNumber}` : ''}` : null,
                order.shippingNeighborhood ? `Col. ${order.shippingNeighborhood}` : null,
                order.shippingZip ? `CP ${order.shippingZip}` : null,
              ].filter(Boolean).join(', ');

              return (
                <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                    <span className="font-bold text-gray-900 block truncate w-28" title={order.id}>
                      #{order.id.slice(0, 8)}
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="font-semibold text-gray-900">
                      {order.customerName || 'Cliente sin nombre'}
                    </div>
                    {order.customerPhone ? (
                      <a
                        href={`https://wa.me/52${order.customerPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-0.5"
                      >
                        <span>📱 {order.customerPhone}</span>
                        <span className="text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">WhatsApp</span>
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 block">{order.customerEmail || 'Sin teléfono'}</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                    {fullAddress ? (
                      <div>
                        <div className="truncate text-xs font-medium text-gray-800" title={fullAddress}>
                          📍 {fullAddress}
                        </div>
                        {hasCoords ? (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            📌 GPS Exacto ({order.locationSource || 'map'})
                          </span>
                        ) : (
                          <span className="inline-block mt-1 text-[11px] text-gray-400">
                            {order.shippingMunicipality ? `${order.shippingMunicipality}, ${order.shippingState || ''}` : 'Sin coordenadas'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sin datos de envío</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {currencyFormatter.format(order.total / 100)}
                    {order.discountCode && (
                      <span className="block text-[11px] font-normal text-emerald-600">
                        Cupón {order.discountCode}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      disabled={updatingId === order.id}
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(
                          order.id,
                          e.target.value as 'pending' | 'paid' | 'shipped' | 'cancelled'
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs font-bold border cursor-pointer transition-colors ${
                        order.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : order.status === 'shipped'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      <option value="pending">⏳ Pendiente de Pago</option>
                      <option value="paid">✓ Pagado (Aprobado)</option>
                      <option value="shipped">🚚 Enviado al Cliente</option>
                      <option value="cancelled">✕ Cancelado</option>
                    </select>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL DE DETALLE DE ORDEN CON DIRECCIÓN Y MINI-MAPA */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 space-y-6">
            
            {/* Cabecera */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-gray-400">Orden #{selectedOrder.id}</span>
                <h3 className="text-xl font-black text-gray-900 mt-1">
                  Detalle de Envío y Pedido
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Registrada el {new Date(selectedOrder.createdAt).toLocaleString('es-MX')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Datos del Cliente y Envío */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Destinatario</h4>
                <p className="text-sm font-bold text-gray-900">{selectedOrder.customerName || 'No especificado'}</p>
                {selectedOrder.customerPhone && (
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                    <span>📞 {selectedOrder.customerPhone}</span>
                    <a
                      href={`https://wa.me/52${selectedOrder.customerPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-600 hover:underline"
                    >
                      Enviar WhatsApp &rarr;
                    </a>
                  </p>
                )}
                {selectedOrder.customerEmail && (
                  <p className="text-xs text-gray-500 mt-0.5">✉️ {selectedOrder.customerEmail}</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Dirección de Entrega</h4>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedOrder.shippingStreet || 'Sin calle'} #{selectedOrder.shippingExtNumber || 'S/N'}
                  {selectedOrder.shippingIntNumber ? ` Int. ${selectedOrder.shippingIntNumber}` : ''}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Col. {selectedOrder.shippingNeighborhood || 'N/A'}, CP {selectedOrder.shippingZip || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedOrder.shippingMunicipality || ''}, {selectedOrder.shippingState || ''}
                </p>
              </div>
            </div>

            {/* Referencias de la casa */}
            {selectedOrder.shippingReferences && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <span>🏠 Referencias para encontrar la casa:</span>
                </h4>
                <p className="text-sm text-amber-950 font-medium">
                  {selectedOrder.shippingReferences}
                </p>
              </div>
            )}

            {/* Mini-mapa y Enlace a Google Maps */}
            {selectedOrder.shippingLat != null && selectedOrder.shippingLng != null ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🗺️ Ubicación Exacta del Cliente:</span>
                    <span className="text-[11px] font-mono font-normal text-gray-500">
                      ({selectedOrder.shippingLat.toFixed(5)}, {selectedOrder.shippingLng.toFixed(5)})
                    </span>
                  </h4>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.shippingLat},${selectedOrder.shippingLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    <span>Abrir Ruta en Google Maps &rarr;</span>
                  </a>
                </div>

                {/* Iframe Mini-Mapa Embebido */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 h-64 w-full bg-gray-100 shadow-inner">
                  <iframe
                    title="Ubicación de entrega"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://maps.google.com/maps?q=${selectedOrder.shippingLat},${selectedOrder.shippingLng}&hl=es&z=17&output=embed`}
                  ></iframe>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-500">
                Esta orden no cuenta con coordenadas GPS. La entrega se realiza con la dirección y el código postal especificados.
              </div>
            )}

            {/* Artículos de la orden */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Artículos</h4>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-sm text-gray-800 space-y-1">
                {selectedOrder.itemsSummary ? (
                  selectedOrder.itemsSummary.split('|').map((item, idx) => (
                    <div key={idx} className="py-1 border-b border-gray-200/60 last:border-0 font-medium">
                      • {item.trim()}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-xs italic">Sin resumen de artículos</p>
                )}
              </div>
            </div>

            {/* Pie con totales */}
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 block">Total pagado</span>
                <span className="text-2xl font-black text-gray-900">
                  {currencyFormatter.format(selectedOrder.total / 100)}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-bold transition-all shadow-sm active:scale-95"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
