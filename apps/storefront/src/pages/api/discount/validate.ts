import type { APIRoute } from 'astro';
import { db, discountCodes, eq, ensureSchema } from '@esqueleto/core';

export const POST: APIRoute = async ({ request }) => {
  try {
    await ensureSchema().catch(() => {});

    const body = await request.json();
    const rawCode = (body.code || '').trim().toUpperCase();
    const cartSubtotal = parseInt(body.cartSubtotal || '0', 10); // En centavos

    if (!rawCode) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Por favor ingresa un código de descuento' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (cartSubtotal <= 0) {
      return new Response(
        JSON.stringify({ valid: false, error: 'El carrito no tiene productos válidos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Buscar el cupón en PostgreSQL
    const results = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, rawCode))
      .limit(1)
      .execute();

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({ valid: false, error: `El código "${rawCode}" no es válido` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const coupon = results[0];

    // 2. Validar estado activo
    if (!coupon.isActive) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Este cupón está temporalmente inactivo' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validar caducidad
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Este cupón ha vencido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Validar límite de canjes
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Este cupón ya ha alcanzado su límite de canjes' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Validar monto mínimo de compra
    if (coupon.minPurchase > 0 && cartSubtotal < coupon.minPurchase) {
      const minFormatted = (coupon.minPurchase / 100).toFixed(2);
      return new Response(
        JSON.stringify({
          valid: false,
          error: `Este cupón requiere una compra mínima de $${minFormatted} MXN`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Calcular monto exacto de descuento en centavos
    let discountAmountCents = 0;
    if (coupon.discountType === 'percentage') {
      discountAmountCents = Math.round((cartSubtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount !== null && discountAmountCents > coupon.maxDiscount) {
        discountAmountCents = coupon.maxDiscount;
      }
    } else {
      // Monto fijo
      discountAmountCents = Math.min(coupon.discountValue, cartSubtotal);
    }

    const newTotalCents = Math.max(0, cartSubtotal - discountAmountCents);

    return new Response(
      JSON.stringify({
        valid: true,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountAmountCents,
        newTotal: newTotalCents,
        message:
          coupon.discountType === 'percentage'
            ? `¡Cupón aplicado! ${coupon.discountValue}% de descuento`
            : `¡Cupón aplicado! -$${(coupon.discountValue / 100).toFixed(2)} MXN`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error validando cupón:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Error al verificar el código de descuento' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
