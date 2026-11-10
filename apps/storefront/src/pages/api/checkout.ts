import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { db, products, orders, modifierOptions, discountCodes, inArray, eq, sql, ensureSchema } from '@esqueleto/core';

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

interface ShippingPayload {
  fullName?: string;
  phone?: string;
  street?: string;
  extNumber?: string;
  intNumber?: string;
  neighborhood?: string;
  municipality?: string;
  city?: string;
  state?: string;
  zip?: string;
  references?: string;
  lat?: number | null;
  lng?: number | null;
  locationSource?: string;
}

const clean = (v: unknown, max = 200): string =>
  typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '';

/** Valida y normaliza los datos de envío. Lanza Error con mensaje legible si falta algo. */
function validateShipping(raw: ShippingPayload | undefined) {
  if (!raw) throw new Error('Faltan los datos de envío');

  const phoneDigits = clean(raw.phone, 30).replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');
  const data = {
    customerName: clean(raw.fullName, 120),
    customerPhone: phoneDigits,
    shippingStreet: clean(raw.street),
    shippingExtNumber: clean(raw.extNumber, 20),
    shippingIntNumber: clean(raw.intNumber, 20) || null,
    shippingNeighborhood: clean(raw.neighborhood),
    shippingMunicipality: clean(raw.municipality),
    shippingCity: clean(raw.city) || null,
    shippingState: clean(raw.state, 80),
    shippingZip: clean(raw.zip, 5),
    shippingReferences: clean(raw.references, 500) || null,
    shippingLat: null as number | null,
    shippingLng: null as number | null,
    locationSource: 'zip' as string,
  };

  const missing: string[] = [];
  if (data.customerName.length < 3) missing.push('nombre completo');
  if (!/^\d{10}$/.test(data.customerPhone)) missing.push('teléfono a 10 dígitos');
  if (!data.shippingStreet) missing.push('calle');
  if (!data.shippingExtNumber) missing.push('número exterior');
  if (!data.shippingNeighborhood) missing.push('colonia');
  if (!/^\d{5}$/.test(data.shippingZip)) missing.push('código postal');
  if (!data.shippingMunicipality) missing.push('municipio');
  if (!data.shippingState) missing.push('estado');
  if (missing.length) {
    throw new Error(`Completa los datos de envío: ${missing.join(', ')}`);
  }

  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  // Coordenadas válidas y dentro (aprox.) de México
  if (
    raw.lat != null && raw.lng != null &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= 14 && lat <= 33.5 && lng >= -118.5 && lng <= -86
  ) {
    data.shippingLat = lat;
    data.shippingLng = lng;
    data.locationSource = raw.locationSource === 'gps' ? 'gps' : 'map';
  }

  return data;
}

class ValidationError extends Error {}

export const POST: APIRoute = async ({ request, url }) => {
  try {
    await ensureSchema().catch(() => {});

    const { items, customerEmail, discountCode, shipping: shippingRaw } = (await request.json()) as {
      items: CheckoutItemPayload[];
      customerEmail?: string;
      discountCode?: string;
      shipping?: ShippingPayload;
    };

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'El carrito está vacío' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let shipping: ReturnType<typeof validateShipping>;
    try {
      shipping = validateShipping(shippingRaw);
    } catch (e: any) {
      throw new ValidationError(e.message);
    }

    const itemIds = Array.from(new Set(items.map((item) => item.id)));

    // 1. Obtener productos auténticos desde PostgreSQL
    const dbProducts = await db.select().from(products).where(inArray(products.id, itemIds));

    // 2. Obtener todas las opciones de modificadores seleccionadas
    const allOptionIds = items
      .flatMap((i) => (i.selectedModifiers || []).map((m) => m.optionId))
      .filter(Boolean);

    const dbOptions = allOptionIds.length > 0
      ? await db.select().from(modifierOptions).where(inArray(modifierOptions.id, allOptionIds))
      : [];

    let subtotalCents = 0;
    const itemsSummaryList: string[] = [];

    // 3. Validar productos y calcular subtotales
    const validatedItems = items.map((item) => {
      const product = dbProducts.find((p) => p.id === item.id);

      if (!product) {
        throw new Error(`Producto no encontrado en el catálogo: ${item.id}`);
      }

      let modifiersDelta = 0;
      const modifierLabels: string[] = [];

      (item.selectedModifiers || []).forEach((mod) => {
        const authenticOpt = dbOptions.find((o) => o.id === mod.optionId);
        const delta = authenticOpt ? authenticOpt.priceDelta : 0;
        modifiersDelta += delta;
        modifierLabels.push(`${mod.modifierName}: ${mod.optionName}`);
      });

      const verifiedUnitPriceCents = product.basePrice + modifiersDelta;
      subtotalCents += verifiedUnitPriceCents * item.quantity;

      const titleWithModifiers = modifierLabels.length > 0
        ? `${product.title} (${modifierLabels.join(', ')})`
        : product.title;

      itemsSummaryList.push(`${item.quantity}x ${titleWithModifiers}`);

      return {
        id: product.id,
        title: titleWithModifiers,
        quantity: item.quantity,
        unit_price: verifiedUnitPriceCents / 100,
        currency_id: 'MXN',
        unitPriceCents: verifiedUnitPriceCents,
      };
    });

    // 4. Validar y procesar Cupón de Descuento si fue enviado
    let appliedDiscountCode: string | null = null;
    let discountAmountCents = 0;

    if (discountCode) {
      const cleanCode = discountCode.trim().toUpperCase();
      const coupons = await db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.code, cleanCode))
        .limit(1)
        .execute();

      if (coupons && coupons.length > 0) {
        const coupon = coupons[0];
        const isNotExpired = !coupon.expiresAt || new Date(coupon.expiresAt) >= new Date();
        const hasRemainingUsage = coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit;
        const meetsMinPurchase = coupon.minPurchase <= 0 || subtotalCents >= coupon.minPurchase;

        if (coupon.isActive && isNotExpired && hasRemainingUsage && meetsMinPurchase) {
          appliedDiscountCode = coupon.code;
          if (coupon.discountType === 'percentage') {
            discountAmountCents = Math.round((subtotalCents * coupon.discountValue) / 100);
            if (coupon.maxDiscount !== null && discountAmountCents > coupon.maxDiscount) {
              discountAmountCents = coupon.maxDiscount;
            }
          } else {
            discountAmountCents = Math.min(coupon.discountValue, subtotalCents);
          }

          // Incrementar contador de usos en segundo plano
          await db
            .update(discountCodes)
            .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
            .where(eq(discountCodes.id, coupon.id))
            .execute();
        }
      }
    }

    const finalTotalCents = Math.max(0, subtotalCents - discountAmountCents);

    if (appliedDiscountCode) {
      itemsSummaryList.push(`[Cupón: ${appliedDiscountCode} (-$${(discountAmountCents / 100).toFixed(2)})]`);
    }

    // 5. Generar ID único para la orden y persistir en PostgreSQL
    const orderId = crypto.randomUUID();

    const rawMpToken = process.env.MP_ACCESS_TOKEN?.trim() || '';
    const hasValidMpToken =
      rawMpToken.length > 20 &&
      !rawMpToken.includes('tu-access-token') &&
      !rawMpToken.includes('TEST_TOKEN_AQUI');

    if (hasValidMpToken) {
      // Modo Mercado Pago Real
      await db.insert(orders).values({
        id: orderId,
        subtotal: subtotalCents,
        discountCode: appliedDiscountCode,
        discountAmount: discountAmountCents,
        total: finalTotalCents,
        status: 'pending',
        customerEmail: customerEmail || null,
        itemsSummary: itemsSummaryList.join(' | '),
        itemsJson: JSON.stringify(items),
        ...shipping,
      });

      const client = new MercadoPagoConfig({ accessToken: rawMpToken });
      const preference = new Preference(client);

      const notificationUrl = process.env.PUBLIC_STOREFRONT_URL
        ? `${process.env.PUBLIC_STOREFRONT_URL}/api/webhook`
        : `${url.origin}/api/webhook`;

      // Si hay descuento, ajustar proporcionalmente los ítems para Mercado Pago
      const discountRatio = subtotalCents > 0 ? (subtotalCents - discountAmountCents) / subtotalCents : 1;
      const mpItems = validatedItems.map((vi) => ({
        id: vi.id,
        title: vi.title,
        quantity: vi.quantity,
        unit_price: parseFloat(((vi.unitPriceCents * discountRatio) / 100).toFixed(2)),
        currency_id: 'MXN',
      }));

      const response = await preference.create({
        body: {
          items: mpItems,
          external_reference: orderId,
          payer: {
            ...(customerEmail ? { email: customerEmail } : {}),
            name: shipping.customerName,
            phone: { area_code: '52', number: shipping.customerPhone },
            address: {
              zip_code: shipping.shippingZip,
              street_name: shipping.shippingStreet,
              street_number: shipping.shippingExtNumber,
            },
          },
          back_urls: {
            success: `${url.origin}/orden-confirmada?order_id=${orderId}&status=approved`,
            failure: `${url.origin}/carrito?status=failure`,
            pending: `${url.origin}/orden-confirmada?order_id=${orderId}&status=pending`,
          },
          auto_return: 'approved',
          notification_url: notificationUrl,
        },
      });

      const checkoutUrl = (rawMpToken.startsWith('TEST-') && response.sandbox_init_point)
        ? response.sandbox_init_point
        : (response.init_point || response.sandbox_init_point);

      return new Response(
        JSON.stringify({
          url: checkoutUrl,
          orderId,
          isDemo: false,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Modo Prueba / Simulación Automática
      await db.insert(orders).values({
        id: orderId,
        subtotal: subtotalCents,
        discountCode: appliedDiscountCode,
        discountAmount: discountAmountCents,
        total: finalTotalCents,
        status: 'paid',
        customerEmail: customerEmail || 'cliente-prueba@afotica.com',
        itemsSummary: itemsSummaryList.join(' | '),
        itemsJson: JSON.stringify(items),
        ...shipping,
      });

      return new Response(
        JSON.stringify({
          url: `${url.origin}/orden-confirmada?order_id=${orderId}&status=approved&mode=demo`,
          orderId,
          isDemo: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: any) {
    console.error('Error procesando checkout:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error procesando el pago' }),
      {
        status: error instanceof ValidationError ? 400 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

