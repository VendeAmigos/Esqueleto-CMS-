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

export const POST: APIRoute = async ({ request, url }) => {
  try {
    await ensureSchema().catch(() => {});

    const { items, customerEmail, discountCode } = (await request.json()) as {
      items: CheckoutItemPayload[];
      customerEmail?: string;
      discountCode?: string;
    };

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'El carrito está vacío' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

