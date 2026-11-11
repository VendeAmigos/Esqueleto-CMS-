import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import {
  db,
  orders,
  eq,
  isDatabaseAvailable,
  markDatabaseOffline,
  getStoredPaymentSettings,
  updateStoredOrderStatus,
} from '@esqueleto/core';

/**
 * Valida la firma criptográfica oficial de Mercado Pago (x-signature HMAC-SHA256)
 * Documentación MP: manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
 */
function verifyMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params;
  if (!secret) return true; // Si el cliente aún no configura Webhook Secret, se valida consultando directamente la API de MP con el Access Token
  if (!xSignature || !dataId) return false;

  const parts = xSignature.split(',');
  let ts = '';
  let v1 = '';

  for (const part of parts) {
    const [key, val] = part.split('=').map((s) => s.trim());
    if (key === 'ts') ts = val || '';
    if (key === 'v1') v1 = val || '';
  }

  if (!ts || !v1) return false;

  const cleanDataId = String(dataId).toLowerCase();
  const manifest = xRequestId
    ? `id:${cleanDataId};request-id:${xRequestId};ts:${ts};`
    : `id:${cleanDataId};ts:${ts};`;

  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHex, 'hex'),
      Buffer.from(v1, 'hex')
    );
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const paymentConfig = await getStoredPaymentSettings(url.origin);

    if (!paymentConfig.mpAccessToken) {
      console.warn('Webhook recibido pero Mercado Pago no tiene Access Token configurado.');
      return new Response(JSON.stringify({ received: true, warning: 'MP_NOT_CONFIGURED' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Mercado Pago puede enviar notificaciones solo por query params
    }

    const paymentId =
      body?.data?.id ||
      url.searchParams.get('data.id') ||
      url.searchParams.get('id');

    const type =
      body?.type ||
      url.searchParams.get('type') ||
      url.searchParams.get('topic');

    // Validar firma HMAC-SHA256 si el cliente configuró su Webhook Secret en el CMS o .env
    if (paymentConfig.mpWebhookSecret && paymentId) {
      const isValidSig = verifyMercadoPagoSignature({
        xSignature: request.headers.get('x-signature'),
        xRequestId: request.headers.get('x-request-id'),
        dataId: String(paymentId),
        secret: paymentConfig.mpWebhookSecret,
      });

      if (!isValidSig) {
        console.warn(`Firma x-signature inválida para notificación de pago ${paymentId}`);
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Procesar eventos de pago consultando directamente a la API oficial de Mercado Pago
    if ((type === 'payment' || body?.action?.startsWith('payment.')) && paymentId) {
      const client = new MercadoPagoConfig({ accessToken: paymentConfig.mpAccessToken });
      const paymentClient = new Payment(client);
      const paymentInfo = await paymentClient.get({ id: String(paymentId) });

      const externalReference = paymentInfo.external_reference;
      const status = paymentInfo.status;
      const payerEmail = paymentInfo.payer?.email;

      console.log(
        `Webhook Mercado Pago: Pago ${paymentId} -> Orden ${externalReference} [${status}]`
      );

      if (externalReference) {
        const mappedStatus =
          status === 'approved'
            ? 'paid'
            : status === 'cancelled' || status === 'rejected' || status === 'refunded'
            ? 'cancelled'
            : 'pending';

        await updateStoredOrderStatus(externalReference, mappedStatus);

        if (await isDatabaseAvailable()) {
          try {
            await db
              .update(orders)
              .set({
                status: mappedStatus,
                mpPaymentId: String(paymentId),
                ...(payerEmail ? { customerEmail: payerEmail } : {}),
              })
              .where(eq(orders.id, externalReference));
          } catch (dbErr) {
            markDatabaseOffline();
            console.error('Error actualizando orden desde webhook:', dbErr);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error en Webhook de Mercado Pago:', error);
    return new Response(JSON.stringify({ received: true, error: error.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async ({ url }) => {
  const paymentConfig = await getStoredPaymentSettings(url.origin);
  return new Response(
    JSON.stringify({
      status: 'active',
      service: 'Mercado Pago Webhook Endpoint',
      mode: paymentConfig.isLiveReady ? paymentConfig.mpMode : 'demo',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
