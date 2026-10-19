import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db, orders, eq } from '@esqueleto/core';

// Inicializar cliente de Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });

export const POST: APIRoute = async ({ request, url }) => {
  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      console.warn('⚠️ Webhook recibido pero MP_ACCESS_TOKEN no está configurado.');
      return new Response('Configuración incompleta', { status: 500 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // El webhook de MP a veces envía datos solo por query params
    }

    // Mercado Pago envía identificadores tanto en el body como en query parameters
    const paymentId =
      body?.data?.id ||
      url.searchParams.get('data.id') ||
      url.searchParams.get('id');

    const type =
      body?.type ||
      url.searchParams.get('type') ||
      url.searchParams.get('topic');

    // Procesar únicamente eventos relacionados con pagos
    if ((type === 'payment' || body?.action?.startsWith('payment.')) && paymentId) {
      const paymentClient = new Payment(client);
      const paymentInfo = await paymentClient.get({ id: paymentId });

      const externalReference = paymentInfo.external_reference;
      const status = paymentInfo.status;
      const payerEmail = paymentInfo.payer?.email;

      console.log(`🔔 Webhook Mercado Pago: Pago ${paymentId} para orden ${externalReference} con estado [${status}]`);

      if (externalReference) {
        if (status === 'approved') {
          await db
            .update(orders)
            .set({
              status: 'paid',
              customerEmail: payerEmail || undefined,
            })
            .where(eq(orders.id, externalReference));

          console.log(`✅ Orden ${externalReference} actualizada a 'paid'.`);
        } else if (status === 'cancelled' || status === 'rejected') {
          await db
            .update(orders)
            .set({
              status: 'cancelled',
            })
            .where(eq(orders.id, externalReference));

          console.log(`❌ Orden ${externalReference} marcada como 'cancelled'.`);
        }
      }
    }

    // Responder siempre 200 OK rápidamente a Mercado Pago para confirmar recepción
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Error en Webhook de Mercado Pago:", error);
    // Retornamos 200 para evitar bloqueos por reintentos si es un error no recuperable
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Mercado Pago a veces verifica endpoints enviando GET
export const GET: APIRoute = async () => {
  return new Response('Mercado Pago Webhook Endpoint Activo', { status: 200 });
};

