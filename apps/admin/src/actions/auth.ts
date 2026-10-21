'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  verifyCredentials,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rateLimit';

export interface LoginActionResult {
  success: boolean;
  error?: string;
  isBlocked?: boolean;
  remainingAttempts?: number;
  lockoutSeconds?: number;
}

export async function loginAction(
  _prevState: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult> {
  const username = formData.get('username')?.toString() || '';
  const password = formData.get('password')?.toString() || '';

  if (!username.trim() || !password) {
    return {
      success: false,
      error: 'Por favor ingresa tu usuario y contraseña.',
    };
  }

  // Obtener IP del cliente para mitigación de fuerza bruta
  const headersList = headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || '127.0.0.1';
  const rateLimitKey = `login_${clientIp}_${username.trim().toLowerCase()}`;

  // 1. Verificar si la IP/Usuario está bloqueado por demasiados intentos
  const rateCheck = checkRateLimit(rateLimitKey);
  if (rateCheck.isBlocked) {
    const minutes = Math.ceil(rateCheck.lockoutSeconds / 60);
    return {
      success: false,
      error: `Acceso bloqueado temporalmente por demasiados intentos fallidos. Intenta nuevamente en ${minutes} minutos.`,
      isBlocked: true,
      lockoutSeconds: rateCheck.lockoutSeconds,
    };
  }

  // 2. Verificar credenciales con comparación timing-safe
  const isValid = await verifyCredentials(username, password);

  if (!isValid) {
    const failedResult = recordFailedAttempt(rateLimitKey);
    if (failedResult.isBlocked) {
      const minutes = Math.ceil(failedResult.lockoutSeconds / 60);
      return {
        success: false,
        error: `Has superado el límite de intentos. Cuenta bloqueada por seguridad durante ${minutes} minutos.`,
        isBlocked: true,
        lockoutSeconds: failedResult.lockoutSeconds,
      };
    }

    return {
      success: false,
      error: `Usuario o contraseña incorrectos. Te quedan ${failedResult.remainingAttempts} intento(s) antes del bloqueo.`,
      remainingAttempts: failedResult.remainingAttempts,
    };
  }

  // 3. Inicio exitoso: reiniciar contador de fallos
  resetRateLimit(rateLimitKey);

  // 4. Generar token de sesión firmado con HMAC-SHA256
  const sessionToken = await createSessionToken(username.trim());

  // 5. Establecer cookie HttpOnly segura
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return { success: true };
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE_NAME);
  redirect('/login');
}
