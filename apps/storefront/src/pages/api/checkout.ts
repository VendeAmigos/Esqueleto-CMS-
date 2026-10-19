import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { db, products, orders, modifierOptions, inArray } from '@esqueleto/core';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });

interface CheckoutItemPayload {
  id: string; // Product ID
  instanceId?: string;
  quantity: number;
  selectedModifiers?: {
    modifierId: string;
    modifierName: string;
    optionId: string;
    optionName: string;
    priceDelta: number;
  }[];
}

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const { items, customerEmail } = (await request.json()) as {
      items: CheckoutItemPayload[];
      customerEmail?: string;
    };

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'El carrito está vacío' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({
          error: 'Falta configurar MP_ACCESS_TOKEN en las variables de entorno (.env)',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const itemIds = Array.from(new Set(items.map((item) => item.id)));

    // 1. Regla de Seguridad Crítica: Obtener productos auténticos desde PostgreSQL
    const dbProducts = await db.select().from(products).where(inArray(products.id, itemIds));

    // 2. Obtener todas las opciones de modificadores seleccionadas para verificar precios auténticos
    const allOptionIds = items
      .flatMap((i) => (i.selectedModifiers || []).map((m) => m.optionId))
      .filter(Boolean);

    const dbOptions = allOptionIds.length > 0
      ? await db.select().from(modifierOptions).where(inArray(modifierOptions.id, allOptionIds))
      : [];

    let totalCents = 0;
    const itemsSummaryList: string[] = [];

    // 3. Construir items validados para Mercado Pago
    const mpItems = items.map((item) => {
      const product = dbProducts.find((p) => p.id === item.id);

      if (!product) {
        throw new Error(`Producto no encontrado en el catálogo: ${item.id}`);
      }

      // Validar precios de modificadores desde la BD para evitar manipulación en el cliente
      let modifiersDelta = 0;
      const modifierLabels: string[] = [];

      (item.selectedModifiers || []).forEach((mod) => {
        const authenticOpt = dbOptions.find((o) => o.id === mod.optionId);
        const delta = authenticOpt ? authenticOpt.priceDelta : 0;
        modifiersDelta += delta;
        modifierLabels.push(`${mod.modifierName}: ${mod.optionName}`);
      });

      const verifiedUnitPriceCents = product.basePrice + modifiersDelta;
      totalCents += verifiedUnitPriceCents * item.quantity;

      const titleWithModifiers = modifierLabels.length > 0
        ? `${product.title} (${modifierLabels.join(', ')})`
        : product.title;

      itemsSummaryList.push(`${item.quantity}x ${titleWithModifiers}`);

      return {
        id: product.id,
        title: titleWithModifiers,
        quantity: item.quantity,
        unit_price: verifiedUnitPriceCents / 100, // Mercado Pago requiere formato decimal (ej: 299.00)
        currency_id: 'MXN',
      };
    });

    // 4. Generar ID único para la orden y persistir en PostgreSQL
    const orderId = crypto.randomUUID();

    await db.insert(orders).values({
      id: orderId,
      total: totalCents,
      status: 'pending',
      customerEmail: customerEmail || null,
      itemsSummary: itemsSummaryList.join(' | '),
      itemsJson: JSON.stringify(items),
    });

    // 5. Crear preferencia de pago en Mercado Pago
    const preference = new Preference(client);

    const notificationUrl = process.env.PUBLIC_STOREFRONT_URL
      ? `${process.env.PUBLIC_STOREFRONT_URL}/api/webhook`
      : `${url.origin}/api/webhook`;

    const response = await preference.create({
      body: {
        items: mpItems,
        external_reference: orderId,
        payer: customerEmail ? { email: customerEmail } : undefined,
        back_urls: {
          success: `${url.origin}/orden-confirmada?order_id=${orderId}&status=approved`,
          failure: `${url.origin}/carrito?status=failure`,
          pending: `${url.origin}/orden-confirmada?order_id=${orderId}&status=pending`,
        },
        auto_return: 'approved',
        notification_url: notificationUrl,
      },
    });

    return new Response(
      JSON.stringify({
        url: response.init_point,
        orderId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error procesando checkout en Mercado Pago:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error procesando el pago' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
