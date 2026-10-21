// apps/admin/src/lib/auth.ts
// Utilidades de autenticación segura compatibles con Node.js y Next.js Edge Runtime (crypto.subtle)

export const SESSION_COOKIE_NAME = 'esqueleto_admin_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 horas

function getSecretKey(): string {
  return (
    process.env.ADMIN_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'esqueleto-super-secure-production-secret-key-2026'
  );
}

function toBase64Url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64url');
  }
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64url').toString('utf-8');
  }
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(escape(atob(base64)));
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function getHmacCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secret = getSecretKey();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export interface SessionPayload {
  user: string;
  exp: number; // Timestamp en milisegundos
  iat: number;
}

/**
 * Genera un token de sesión firmado criptográficamente con HMAC-SHA256
 */
export async function createSessionToken(username: string): Promise<string> {
  const now = Date.now();
  const payload: SessionPayload = {
    user: username,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const payloadString = JSON.stringify(payload);
  const payloadBase64 = toBase64Url(payloadString);

  const enc = new TextEncoder();
  const key = await getHmacCryptoKey();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadBase64));
  const signatureHex = bufferToHex(signatureBuffer);

  return `${payloadBase64}.${signatureHex}`;
}

/**
 * Valida la firma criptográfica y la vigencia del token de sesión
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token || !token.includes('.')) return null;

  const [payloadBase64, signatureHex] = token.split('.');
  if (!payloadBase64 || !signatureHex) return null;

  try {
    const enc = new TextEncoder();
    const key = await getHmacCryptoKey();
    const signatureBytes = hexToBuffer(signatureHex);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as BufferSource,
      enc.encode(payloadBase64)
    );

    if (!isValid) return null;

    const payloadJson = fromBase64Url(payloadBase64);
    const payload = JSON.parse(payloadJson) as SessionPayload;

    // Verificar expiración
    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Compara dos cadenas de forma segura contra ataques de tiempo (Timing Attacks)
 */
export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const hashA = await crypto.subtle.digest('SHA-256', enc.encode(a));
  const hashB = await crypto.subtle.digest('SHA-256', enc.encode(b));

  const bufA = new Uint8Array(hashA);
  const bufB = new Uint8Array(hashB);

  let mismatch = 0;
  for (let i = 0; i < bufA.length; i++) {
    mismatch |= bufA[i] ^ bufB[i];
  }

  return mismatch === 0;
}

/**
 * Verifica usuario y contraseña del admin con timing-safe compare
 */
export async function verifyCredentials(user: string, pass: string): Promise<boolean> {
  const expectedUser = (process.env.ADMIN_USER || 'admin').trim();
  const expectedPass = (process.env.ADMIN_PASSWORD || 'esqueleto').trim();

  const userMatch = await timingSafeEqualString(user.trim(), expectedUser);
  const passMatch = await timingSafeEqualString(pass.trim(), expectedPass);

  return userMatch && passMatch;
}
