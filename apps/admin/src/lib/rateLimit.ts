// apps/admin/src/lib/rateLimit.ts
// Protección contra ataques de fuerza bruta y diccionario

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

const attemptsMap = new Map<string, AttemptRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos de bloqueo

// Limpieza periódica de registros obsoletos
function cleanupStaleRecords() {
  const now = Date.now();
  for (const [key, record] of attemptsMap.entries()) {
    if (record.blockedUntil && now > record.blockedUntil) {
      attemptsMap.delete(key);
    } else if (!record.blockedUntil && now - record.firstAttempt > WINDOW_MS) {
      attemptsMap.delete(key);
    }
  }
}

/**
 * Revisa si una clave (ej: IP o usuario) está actualmente bloqueada
 */
export function checkRateLimit(key: string): {
  isBlocked: boolean;
  remainingAttempts: number;
  lockoutSeconds: number;
} {
  cleanupStaleRecords();

  const record = attemptsMap.get(key);
  const now = Date.now();

  if (!record) {
    return { isBlocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS, lockoutSeconds: 0 };
  }

  // Si está bloqueado
  if (record.blockedUntil && now < record.blockedUntil) {
    const lockoutSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { isBlocked: true, remainingAttempts: 0, lockoutSeconds };
  }

  // Si el bloqueo expiró
  if (record.blockedUntil && now >= record.blockedUntil) {
    attemptsMap.delete(key);
    return { isBlocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS, lockoutSeconds: 0 };
  }

  // Si la ventana de tiempo expiró
  if (now - record.firstAttempt > WINDOW_MS) {
    attemptsMap.delete(key);
    return { isBlocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS, lockoutSeconds: 0 };
  }

  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - record.count);
  return { isBlocked: remainingAttempts <= 0, remainingAttempts, lockoutSeconds: 0 };
}

/**
 * Registra un intento fallido y bloquea si supera el umbral
 */
export function recordFailedAttempt(key: string): {
  isBlocked: boolean;
  remainingAttempts: number;
  lockoutSeconds: number;
} {
  cleanupStaleRecords();

  const now = Date.now();
  let record = attemptsMap.get(key);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    record = {
      count: 1,
      firstAttempt: now,
      blockedUntil: null,
    };
  } else {
    record.count += 1;
  }

  // Si superó el límite, activar bloqueo
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = now + LOCKOUT_MS;
    attemptsMap.set(key, record);
    return {
      isBlocked: true,
      remainingAttempts: 0,
      lockoutSeconds: Math.ceil(LOCKOUT_MS / 1000),
    };
  }

  attemptsMap.set(key, record);
  return {
    isBlocked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - record.count,
    lockoutSeconds: 0,
  };
}

/**
 * Resetea los intentos fallidos al iniciar sesión exitosamente
 */
export function resetRateLimit(key: string): void {
  attemptsMap.delete(key);
}
