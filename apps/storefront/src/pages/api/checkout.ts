import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import {
  db,
  discountCodes,
  eq,
  sql,
  isDatabaseAvailable,
  markDatabaseOffline,
  getStoredProducts,
  getStoredPaymentSettings,
  getStoredSiteSettings,
  saveStoredOrder,
} from '@esqueleto/core';

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
  deliveryMethod?: 'delivery' | 'pickup';
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

/** Valida y normaliza los datos de envío (o retiro presencial si está habilitado en CMS). */
function validateShipping(
  raw: ShippingPayload | undefined,
  pickupAllowed: boolean,
  pickupAddress: string
) {
  if (!raw) throw new Error('Faltan los datos de envío');

  const phoneDigits = clean(raw.phone, 30).replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '');
  const isPickup = pickupAllowed && raw.deliveryMethod === 'pickup';

  const customerName = clean(raw.fullName, 120);
  if (customerName.length < 3 || !/^\d{10}$/.test(phoneDigits)) {
    const contactMissing: string[] = [];
    if (customerName.length < 3) contactMissing.push('nombre completo');
    if (!/^\d{10}$/.test(phoneDigits)) contactMissing.push('teléfono a 10 dígitos');
    throw new Error(`Completa tus datos de contacto: ${contactMissing.join(', ')}`);
  }

  if (isPickup) {
    return {
      isPickup: true,
      customerName,
      customerPhone: phoneDigits,
      shippingStreet: pickupAddress || 'Recoger en Tienda / Estudio',
      shippingExtNumber: 'S/N',
      shippingIntNumber: null as string | null,
      shippingNeighborhood: 'Entrega presencial',
      shippingMunicipality: 'Tienda',
      shippingCity: null as string | null,
      shippingState: 'Local',
      shippingZip: '00000',
      shippingReferences: clean(raw.references, 500) || 'Modalidad: Recoger en tienda',
      shippingLat: null as number | null,
      shippingLng: null as number | null,
      locationSource: 'pickup',
    };
  }

  const data = {
    isPickup: false,
    customerName,
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

    const siteSettings = await getStoredSiteSettings();
    const activeCurrency = siteSettings.currencyCode || 'MXN';

    let shipping: ReturnType<typeof validateShipping>;
    try {
      shipping = validateShipping(
        shippingRaw,
        Boolean(siteSettings.pickupEnabled),
        siteSettings.pickupAddress || ''
      );
    } catch (e: any) {
      throw new ValidationError(e.message);
    }

    const { isPickup, ...shippingRecord } = shipping;

    // 1. Obtener productos auténticos desde el store híbrido (PostgreSQL o store local sin ECONNRESET)
    const allStoredProducts = await getStoredProducts();
    const dbProducts = allStoredProducts.filter((p) => items.some((i) => i.id === p.id));

    // 2. Mapa de todas las opciones de modificadores
    const dbOptions = allStoredProducts.flatMap((p) =>
      (p.modifiers || []).flatMap((m) => m.options || [])
    );

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
        const delta = authenticOpt ? authenticOpt.priceDelta : (mod.priceDelta || 0);
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
        currency_id: activeCurrency,
        unitPriceCents: verifiedUnitPriceCents,
      };
    });

    // 4. Validar y procesar Cupón de Descuento si fue enviado
    let appliedDiscountCode: string | null = null;
    let discountAmountCents = 0;

    if (discountCode) {
      const cleanCode = discountCode.trim().toUpperCase();
      let coupon: any = null;

      if (await isDatabaseAvailable()) {
        try {
          const coupons = await db
            .select()
            .from(discountCodes)
            .where(eq(discountCodes.code, cleanCode))
            .limit(1)
            .execute();
          if (coupons && coupons.length > 0) coupon = coupons[0];
        } catch {
          markDatabaseOffline();
        }
      }

      // Fallback de cupones predeterminados si PostgreSQL no está disponible
      if (!coupon) {
        const defaultCoupons: Record<string, any> = {
          ARTE10: { id: 'disc-01', code: 'ARTE10', discountType: 'percentage', discountValue: 10, minPurchase: 0, maxDiscount: null, usageLimit: 500, usedCount: 0, isActive: true, expiresAt: null },
          PRINTS20: { id: 'disc-02', code: 'PRINTS20', discountType: 'percentage', discountValue: 20, minPurchase: 30000, maxDiscount: 15000, usageLimit: 200, usedCount: 0, isActive: true, expiresAt: null },
          REGALO50: { id: 'disc-03', code: 'REGALO50', discountType: 'fixed', discountValue: 5000, minPurchase: 25000, maxDiscount: null, usageLimit: 100, usedCount: 0, isActive: true, expiresAt: null },
        };
        coupon = defaultCoupons[cleanCode] || null;
      }

      if (coupon) {
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

          if (await isDatabaseAvailable()) {
            try {
              await db
                .update(discountCodes)
                .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
                .where(eq(discountCodes.id, coupon.id))
                .execute();
            } catch {
              markDatabaseOffline();
            }
          }
        }
      }
    }

    const discountedSubtotalCents = Math.max(0, subtotalCents - discountAmountCents);
    const unlockedFreeShipping =
      siteSettings.freeShippingThresholdCents !== null &&
      subtotalCents >= siteSettings.freeShippingThresholdCents;
    const shippingFeeCents =
      !isPickup && !unlockedFreeShipping && (siteSettings.shippingFeeCents || 0) > 0
        ? siteSettings.shippingFeeCents
        : 0;

    const finalTotalCents = discountedSubtotalCents + shippingFeeCents;

    if (appliedDiscountCode) {
      itemsSummaryList.push(`[Cupón: ${appliedDiscountCode} (-$${(discountAmountCents / 100).toFixed(2)})]`);
    }
    if (isPickup) {
      itemsSummaryList.push('[Entrega: Recoger en tienda]');
    } else if (shippingFeeCents > 0) {
      itemsSummaryList.push(`[Envío: +$${(shippingFeeCents / 100).toFixed(2)}]`);
    }

    // 5. Generar ID único para la orden y obtener configuración activa de pagos (CMS o .env)
    const orderId = crypto.randomUUID();
    const paymentConfig = await getStoredPaymentSettings(url.origin);

    if (paymentConfig.isLiveReady) {
      const rawMpToken = paymentConfig.mpAccessToken;
      const client = new MercadoPagoConfig({ accessToken: rawMpToken });
      const preference = new Preference(client);

      const baseStoreUrl = (paymentConfig.storefrontUrl || url.origin).replace(/\/+$/, '');
      const isHttpsStore = baseStoreUrl.startsWith('https://');
      const notificationUrl = `${baseStoreUrl}/api/webhook`;

      // Si hay descuento, ajustar proporcionalmente los ítems para Mercado Pago
      const discountRatio = subtotalCents > 0 ? (subtotalCents - discountAmountCents) / subtotalCents : 1;
      const mpItems = validatedItems.map((vi) => ({
        id: vi.id,
        title: vi.title,
        quantity: vi.quantity,
        unit_price: parseFloat(((vi.unitPriceCents * discountRatio) / 100).toFixed(2)),
        currency_id: activeCurrency,
      }));
      if (shippingFeeCents > 0) {
        mpItems.push({
          id: 'envio-domicilio',
          title: 'Envío a domicilio',
          quantity: 1,
          unit_price: parseFloat((shippingFeeCents / 100).toFixed(2)),
          currency_id: activeCurrency,
        });
      }

      const response = await preference.create({
        body: {
          items: mpItems,
          external_reference: orderId,
          statement_descriptor: paymentConfig.statementDescriptor || 'TIENDA ONLINE',
          binary_mode: paymentConfig.binaryMode,
          payer: {
            ...(customerEmail ? { email: customerEmail } : {}),
            name: shippingRecord.customerName,
            phone: { area_code: '52', number: shippingRecord.customerPhone },
            address: {
              zip_code: shippingRecord.shippingZip,
              street_name: shippingRecord.shippingStreet,
              street_number: shippingRecord.shippingExtNumber,
            },
          },
          back_urls: {
            success: `${baseStoreUrl}/orden-confirmada?order_id=${orderId}&status=approved`,
            failure: `${baseStoreUrl}/carrito?status=failure`,
            pending: `${baseStoreUrl}/orden-confirmada?order_id=${orderId}&status=pending`,
          },
          ...(isHttpsStore ? { auto_return: 'approved' } : {}),
          ...(isHttpsStore ? { notification_url: notificationUrl } : {}),
        },
      });

      await saveStoredOrder({
        id: orderId,
        subtotal: subtotalCents,
        discountCode: appliedDiscountCode,
        discountAmount: discountAmountCents,
        total: finalTotalCents,
        status: 'pending',
        customerEmail: customerEmail || null,
        itemsSummary: itemsSummaryList.join(' | '),
        itemsJson: JSON.stringify(items),
        mpPreferenceId: response.id || null,
        ...shippingRecord,
      });

      const isSandbox = paymentConfig.mpMode === 'sandbox' || rawMpToken.startsWith('TEST-');
      const checkoutUrl = (isSandbox && response.sandbox_init_point)
        ? response.sandbox_init_point
        : (response.init_point || response.sandbox_init_point);

      return new Response(
        JSON.stringify({
          url: checkoutUrl,
          orderId,
          isDemo: false,
          mode: isSandbox ? 'sandbox' : 'production',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Modo Prueba / Simulación Automática
      await saveStoredOrder({
        id: orderId,
        subtotal: subtotalCents,
        discountCode: appliedDiscountCode,
        discountAmount: discountAmountCents,
        total: finalTotalCents,
        status: 'paid',
        customerEmail: customerEmail || 'cliente-prueba@afotica.com',
        itemsSummary: itemsSummaryList.join(' | '),
        itemsJson: JSON.stringify(items),
        ...shippingRecord,
      });

      return new Response(
        JSON.stringify({
          url: `${url.origin}/orden-confirmada?order_id=${orderId}&status=approved&mode=demo&total=${finalTotalCents}`,
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

