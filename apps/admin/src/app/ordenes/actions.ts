'use server';

import { updateStoredOrderStatus, saveStoredOrder } from '@esqueleto/core';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function changeOrderStatusAction(
  orderId: string,
  status: 'pending' | 'paid' | 'shipped' | 'cancelled'
) {
  await updateStoredOrderStatus(orderId, status);
  revalidatePath('/');
  revalidatePath('/ordenes');
  return { success: true };
}

export async function seedSampleOrdersAction() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const sampleOrders = [
    {
      id: `ord-${crypto.randomUUID().slice(0, 8)}`,
      status: 'paid' as const,
      subtotal: 67000,
      discountCode: null,
      discountAmount: 0,
      total: 67000,
      customerName: 'Valeria Mendoza',
      customerPhone: '5512345678',
      customerEmail: 'valeria@ejemplo.mx',
      itemsSummary: '1x Tote Bag Ilustrada "Flora Nocturna" | 1x Pack de 10 Stickers Holográficos',
      itemsJson: JSON.stringify([
        { id: 'prod-totebag-flora', name: 'Tote Bag Ilustrada "Flora Nocturna"', quantity: 1, unitPrice: 45000 },
        { id: 'prod-pack-stickers-brujitas', name: 'Pack de 10 Stickers Holográficos', quantity: 1, unitPrice: 22000 },
      ]),
      shippingStreet: 'Av. Álvaro Obregón',
      shippingExtNumber: '185',
      shippingIntNumber: '4B',
      shippingNeighborhood: 'Roma Norte',
      shippingMunicipality: 'Cuauhtémoc',
      shippingCity: 'Ciudad de México',
      shippingState: 'Ciudad de México',
      shippingZip: '06700',
      shippingReferences: 'Edificio de ladrillo con portón negro, dejar en recepción',
      shippingLat: 19.4172,
      shippingLng: -99.1621,
      locationSource: 'gps',
      createdAt: new Date(now - 2 * 3600 * 1000),
    },
    {
      id: `ord-${crypto.randomUUID().slice(0, 8)}`,
      status: 'shipped' as const,
      subtotal: 56000,
      discountCode: 'BIENVENIDA10',
      discountAmount: 5600,
      total: 50400,
      customerName: 'Carlos Ramírez',
      customerPhone: '3398765432',
      customerEmail: 'carlos.ramirez@ejemplo.mx',
      itemsSummary: '2x Art Print "Jardín Secreto" | 1x Pin Esmaltado "Gato Astral"',
      itemsJson: JSON.stringify([
        { id: 'prod-print-jardin-secreto', name: 'Art Print "Jardín Secreto"', quantity: 2, unitPrice: 19000 },
        { id: 'prod-pin-gato-astral', name: 'Pin Esmaltado "Gato Astral"', quantity: 1, unitPrice: 18000 },
      ]),
      shippingStreet: 'Calle Morelos',
      shippingExtNumber: '412',
      shippingIntNumber: null,
      shippingNeighborhood: 'Colonia Americana',
      shippingMunicipality: 'Guadalajara',
      shippingCity: 'Guadalajara',
      shippingState: 'Jalisco',
      shippingZip: '44160',
      shippingReferences: 'Casa blanca con árbol de bugambilias afuera',
      shippingLat: 20.6736,
      shippingLng: -103.3689,
      locationSource: 'map',
      createdAt: new Date(now - 1 * dayMs),
    },
    {
      id: `ord-${crypto.randomUUID().slice(0, 8)}`,
      status: 'pending' as const,
      subtotal: 45000,
      discountCode: null,
      discountAmount: 0,
      total: 45000,
      customerName: 'Mariana Torres',
      customerPhone: '8123456789',
      customerEmail: 'mariana.t@ejemplo.mx',
      itemsSummary: '1x Tote Bag Ilustrada "Flora Nocturna"',
      itemsJson: JSON.stringify([
        { id: 'prod-totebag-flora', name: 'Tote Bag Ilustrada "Flora Nocturna"', quantity: 1, unitPrice: 45000 },
      ]),
      shippingStreet: 'Calzada del Valle',
      shippingExtNumber: '350',
      shippingIntNumber: 'Local 2',
      shippingNeighborhood: 'Del Valle',
      shippingMunicipality: 'San Pedro Garza García',
      shippingCity: 'Monterrey',
      shippingState: 'Nuevo León',
      shippingZip: '66220',
      shippingReferences: 'Frente al parque lineal',
      shippingLat: 25.6573,
      shippingLng: -100.3698,
      locationSource: 'manual',
      createdAt: new Date(now - 2 * dayMs),
    },
  ];

  for (const ord of sampleOrders) {
    await saveStoredOrder(ord);
  }

  revalidatePath('/');
  revalidatePath('/ordenes');
  return { success: true };
}
