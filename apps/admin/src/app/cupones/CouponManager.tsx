'use client';

import { useState } from 'react';
import {
  createDiscountCode,
  updateDiscountCode,
  toggleDiscountCodeStatus,
  deleteDiscountCode,
} from './actions';

export interface DiscountCodeItem {
  id: string;
  code: string;
  description: string | null;
  discountType: string; // 'percentage' | 'fixed'
  discountValue: number;
  minPurchase: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: Date | string | null;
  createdAt: Date | string;
}

interface CouponManagerProps {
  coupons: DiscountCodeItem[];
}

export default function CouponManager({ coupons: initialCoupons }: CouponManagerProps) {
  const [coupons, setCoupons] = useState<DiscountCodeItem[]>(initialCoupons);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<DiscountCodeItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number | string>('15');
  const [minPurchase, setMinPurchase] = useState<number | string>('0');
  const [maxDiscount, setMaxDiscount] = useState<number | string>('');
  const [usageLimit, setUsageLimit] = useState<number | string>('');
  const [expiresAt, setExpiresAt] = useState('');

  const currencyFormatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });

  const openCreateModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue('15');
    setMinPurchase('0');
    setMaxDiscount('');
    setUsageLimit('');
    setExpiresAt('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: DiscountCodeItem) => {
    setEditingCoupon(item);
    setCode(item.code);
    setDescription(item.description || '');
    setDiscountType(item.discountType as 'percentage' | 'fixed');
    setDiscountValue(
      item.discountType === 'percentage'
        ? item.discountValue
        : (item.discountValue / 100).toString()
    );
    setMinPurchase((item.minPurchase / 100).toString());
    setMaxDiscount(item.maxDiscount ? (item.maxDiscount / 100).toString() : '');
    setUsageLimit(item.usageLimit ? item.usageLimit.toString() : '');
    setExpiresAt(
      item.expiresAt
        ? new Date(item.expiresAt).toISOString().split('T')[0]
        : ''
    );
    setIsModalOpen(true);
  };

  const handleGenerateCode = () => {
    const prefixes = ['ARTE', 'PRINTS', 'STICKER', 'CREATIVO', 'LUNA'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setCode(`${randomPrefix}${randomSuffix}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsSubmitting(true);
    const formData = new FormData();
    if (editingCoupon) {
      formData.append('id', editingCoupon.id);
      formData.append('isActive', editingCoupon.isActive.toString());
    }
    formData.append('code', code.trim().toUpperCase());
    formData.append('description', description.trim());
    formData.append('discountType', discountType);
    formData.append('discountValue', discountValue.toString());
    formData.append('minPurchase', minPurchase.toString() || '0');
    if (maxDiscount) formData.append('maxDiscount', maxDiscount.toString());
    if (usageLimit) formData.append('usageLimit', usageLimit.toString());
    if (expiresAt) formData.append('expiresAt', expiresAt);

    const res = editingCoupon
      ? await updateDiscountCode(formData)
      : await createDiscountCode(formData);

    setIsSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
      window.location.reload();
    } else {
      alert(res.error || 'Ocurrió un error al guardar el cupón');
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    // Optimistic UI update
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !currentStatus } : c))
    );
    const res = await toggleDiscountCodeStatus(id, currentStatus);
    if (!res.success) {
      // Revert if error
      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: currentStatus } : c))
      );
      alert(res.error || 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async (id: string, couponCode: string) => {
    if (!confirm(`¿Eliminar definitivamente el cupón "${couponCode}"?`)) return;

    setCoupons((prev) => prev.filter((c) => c.id !== id));
    const res = await deleteDiscountCode(id);
    if (!res.success) {
      alert(res.error || 'No se pudo eliminar el cupón');
      window.location.reload();
    }
  };

  const filteredCoupons = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCouponsCount = coupons.filter((c) => c.isActive).length;
  const totalUsagesCount = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

  return (
    <div className="space-y-8">
      {/* 1. Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Cupones</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{coupons.length}</p>
          <span className="text-xs text-gray-400 mt-1 inline-block">Registrados en la plataforma</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider">Cupones Activos</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700">{activeCouponsCount}</p>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">Disponibles para compras</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-bold uppercase tracking-wider">Canjes Realizados</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-indigo-700">{totalUsagesCount}</p>
          <span className="text-xs text-indigo-500 font-medium mt-1 inline-block">Veces aplicado en el checkout</span>
        </div>
      </div>

      {/* 2. Barra de Control Superior */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código o descripción..."
              className="w-full sm:max-w-md rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-black focus:ring-black"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
        >
          <span>+</span> Crear Nuevo Cupón
        </button>
      </div>

      {/* 3. Listado de Cupones */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filteredCoupons.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            </div>
            <h3 className="text-base font-bold text-gray-900">No se encontraron cupones</h3>
            <p className="text-xs text-gray-400 mt-1">Crea tu primer código de descuento con el botón de arriba.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">Código & Descripción</th>
                  <th className="px-6 py-4 text-left">Descuento</th>
                  <th className="px-6 py-4 text-left">Condiciones</th>
                  <th className="px-6 py-4 text-left">Usos</th>
                  <th className="px-6 py-4 text-left">Vigencia</th>
                  <th className="px-6 py-4 text-left">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredCoupons.map((item) => {
                  const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
                  const isLimitReached = item.usageLimit !== null && item.usedCount >= item.usageLimit;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Código */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg text-black">
                            {item.code}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-1 max-w-xs">{item.description}</p>
                        )}
                      </td>

                      {/* Tipo y Valor */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">
                          {item.discountType === 'percentage'
                            ? `${item.discountValue}% OFF`
                            : `-${currencyFormatter.format(item.discountValue / 100)}`}
                        </span>
                        {item.maxDiscount && item.discountType === 'percentage' && (
                          <p className="text-[11px] text-gray-400">
                            Tope máx: {currencyFormatter.format(item.maxDiscount / 100)}
                          </p>
                        )}
                      </td>

                      {/* Condiciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        {item.minPurchase > 0 ? (
                          <span>Mínimo: {currencyFormatter.format(item.minPurchase / 100)}</span>
                        ) : (
                          <span className="text-gray-400">Sin monto mínimo</span>
                        )}
                      </td>

                      {/* Usos */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <span className="font-semibold text-gray-900">{item.usedCount}</span>
                        {item.usageLimit !== null ? (
                          <span className="text-gray-400"> / {item.usageLimit} canjes</span>
                        ) : (
                          <span className="text-gray-400"> / Ilimitado</span>
                        )}
                      </td>

                      {/* Vigencia */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        {item.expiresAt ? (
                          <span className={isExpired ? 'text-red-500 font-semibold' : ''}>
                            {new Date(item.expiresAt).toLocaleDateString('es-MX')}
                            {isExpired && ' (Vencido)'}
                          </span>
                        ) : (
                          <span className="text-gray-400">Sin caducidad</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggle(item.id, item.isActive)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            !item.isActive
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : isExpired || isLimitReached
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              !item.isActive
                                ? 'bg-gray-400'
                                : isExpired || isLimitReached
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          {!item.isActive
                            ? 'Pausado'
                            : isExpired
                            ? 'Expirado'
                            : isLimitReached
                            ? 'Agotado'
                            : 'Activo'}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.code)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Modal para Crear / Editar Cupón */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingCoupon ? 'Editar Cupón de Descuento' : 'Crear Código de Descuento'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configura descuentos por porcentaje o monto fijo para tus compradores.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-black text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Código y Generador */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Código de Descuento *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Ej. BIENVENIDA10"
                    className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 font-mono text-base font-bold uppercase tracking-wider text-black focus:border-black focus:ring-black"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Generar
                  </button>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. 10% de descuento en láminas y stickers de autor"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-black focus:ring-black"
                />
              </div>

              {/* Tipo de Descuento y Valor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Tipo de Descuento *
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm bg-white font-medium focus:border-black focus:ring-black"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo ($ MXN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {discountType === 'percentage' ? 'Porcentaje de Descuento (%)' : 'Monto en Pesos ($ MXN)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step={discountType === 'percentage' ? '1' : '0.5'}
                    max={discountType === 'percentage' ? '100' : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-bold focus:border-black focus:ring-black"
                  />
                </div>
              </div>

              {/* Compra mínima y Tope de Descuento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Compra Mínima ($ MXN)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    placeholder="0 = sin mínimo"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-black focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Descuento Máximo ($ MXN)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="Opcional (para %)"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-black focus:ring-black"
                  />
                </div>
              </div>

              {/* Límite de usos y Fecha de vencimiento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Límite Total de Usos
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="Vacío = Ilimitado"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-black focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Fecha de Expiración
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-black focus:ring-black"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : editingCoupon ? 'Actualizar Cupón' : 'Crear Cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
