'use server';

import {
  getStoredPaymentSettings,
  saveStoredPaymentSettings,
} from '@esqueleto/core';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

async function ensureAdminAuthenticated() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    throw new Error('Sesión no autorizada. Inicia sesión nuevamente.');
  }
  const session = await verifySessionToken(token);
  if (!session) {
    throw new Error('Sesión expirada o inválida.');
  }
  return session;
}

export async function savePaymentGatewaySettings(formData: FormData) {
  try {
    await ensureAdminAuthenticated();

    const mpEnabled = formData.get('mpEnabled') === 'true';
    const mpMode = (formData.get('mpMode')?.toString() === 'sandbox' ? 'sandbox' : 'production') as
      | 'sandbox'
      | 'production';
    const mpPublicKey = (formData.get('mpPublicKey')?.toString() || '').trim();
    const mpAccessToken = (formData.get('mpAccessToken')?.toString() || '').trim();
    const mpWebhookSecret = (formData.get('mpWebhookSecret')?.toString() || '').trim();
    const storefrontUrl = (formData.get('storefrontUrl')?.toString() || '').trim();
    const statementDescriptor = (formData.get('statementDescriptor')?.toString() || 'TIENDA ONLINE').trim();
    const binaryMode = formData.get('binaryMode') === 'true';

    // Si el cliente dejó el Access Token con asteriscos o vacío pero ya tenía uno guardado, conservar el existente
    const current = await getStoredPaymentSettings();
    const finalAccessToken =
      mpAccessToken === '••••••••' || (!mpAccessToken && current.mpAccessToken)
        ? current.mpAccessToken
        : mpAccessToken;

    const finalWebhookSecret =
      mpWebhookSecret === '••••••••' || (!mpWebhookSecret && current.mpWebhookSecret)
        ? current.mpWebhookSecret
        : mpWebhookSecret;

    const saved = await saveStoredPaymentSettings({
      mpEnabled,
      mpMode,
      mpPublicKey,
      mpAccessToken: finalAccessToken,
      mpWebhookSecret: finalWebhookSecret,
      storefrontUrl: storefrontUrl || current.storefrontUrl || 'http://localhost:4321',
      statementDescriptor,
      binaryMode,
    });

    revalidatePath('/pagos');
    revalidatePath('/');

    return {
      success: true,
      settings: saved,
    };
  } catch (error: any) {
    console.error('Error guardando configuración de pagos:', error);
    return {
      success: false,
      error: error.message || 'No se pudo guardar la configuración de pagos',
    };
  }
}

export async function testMercadoPagoTokenAction(rawTokenInput?: string) {
  try {
    await ensureAdminAuthenticated();

    const current = await getStoredPaymentSettings();
    const tokenToTest = (rawTokenInput && rawTokenInput !== '••••••••'
      ? rawTokenInput
      : current.mpAccessToken
    ).trim();

    if (!tokenToTest || tokenToTest.length < 20) {
      return {
        success: false,
        error: 'Ingresa un Access Token válido de Mercado Pago (inicia con APP_USR-... o TEST-...).',
      };
    }

    if (!tokenToTest.startsWith('APP_USR-') && !tokenToTest.startsWith('TEST-')) {
      return {
        success: false,
        error: 'El Access Token debe comenzar con "APP_USR-" (Producción) o "TEST-" (Pruebas).',
      };
    }

    const res = await fetch('https://api.mercadopago.com/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenToTest}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Mercado Pago rechazó la credencial (HTTP ${res.status}). Verifica que copiaste el "Access Token" completo y sin espacios.`,
      };
    }

    const account = await res.json();
    const isTestToken = tokenToTest.startsWith('TEST-');

    return {
      success: true,
      account: {
        id: account.id,
        nickname: account.nickname || 'Cuenta Verificada',
        email: account.email || 'Correo protegido',
        firstName: account.first_name || '',
        lastName: account.last_name || '',
        countryId: String(account.country_id || 'MLM'),
        siteId: String(account.site_id || 'MLM'),
        mode: (isTestToken ? 'sandbox' : 'production') as 'sandbox' | 'production',
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `No se pudo contactar con Mercado Pago: ${error.message || 'Error de red'}`,
    };
  }
}

