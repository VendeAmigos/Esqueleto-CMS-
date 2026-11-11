import fs from 'node:fs';
import path from 'node:path';
import { db, isDatabaseAvailable, markDatabaseOffline, ensureSchema, eq } from './index';
import { paymentSettings, type PaymentSettings } from './schema';

export interface StoredPaymentConfig {
  id: string;
  mpEnabled: boolean;
  mpMode: 'sandbox' | 'production';
  mpPublicKey: string;
  mpAccessToken: string;
  mpWebhookSecret: string;
  storefrontUrl: string;
  statementDescriptor: string;
  binaryMode: boolean;
  source: 'cms' | 'env' | 'demo';
  isLiveReady: boolean;
  updatedAt?: string;
}

function getCmsDataDir(): string {
  const cwd = process.cwd();
  const candidates = [
    process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : '',
    path.resolve(cwd, 'uploads'),
    path.resolve(cwd, '../../uploads'),
    path.resolve(cwd, '../uploads'),
  ].filter(Boolean);

  let baseUploads = path.resolve(cwd, 'uploads');
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      baseUploads = dir;
      break;
    }
  }

  const privateDir = path.join(baseUploads, '.cms-data');
  try {
    if (!fs.existsSync(privateDir)) {
      fs.mkdirSync(privateDir, { recursive: true });
    }
  } catch {
    // ignore
  }
  return privateDir;
}

function getPaymentSettingsFilePath(): string {
  return path.join(getCmsDataDir(), 'payment-settings.json');
}

function isTokenConfigured(token: string | null | undefined): boolean {
  if (!token) return false;
  const t = token.trim();
  return (
    t.length > 20 &&
    !t.includes('tu-access-token') &&
    !t.includes('TEST_TOKEN_AQUI') &&
    (t.startsWith('APP_USR-') || t.startsWith('TEST-'))
  );
}

function readLocalPaymentSettings(): Partial<PaymentSettings> | null {
  const filePath = getPaymentSettingsFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Error leyendo payment-settings.json local:', err);
  }
  return null;
}

function writeLocalPaymentSettings(data: Partial<PaymentSettings>): void {
  const filePath = getPaymentSettingsFilePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error guardando payment-settings.json local:', err);
  }
}

/**
 * Obtiene la configuración activa de la pasarela de pagos combinando:
 * 1. Lo configurado desde el panel CMS (PostgreSQL o store compartido `.cms-data/payment-settings.json`)
 * 2. Fallback automático a variables de entorno (.env) si el CMS aún no tiene credenciales guardadas
 */
export async function getStoredPaymentSettings(fallbackOrigin?: string): Promise<StoredPaymentConfig> {
  let dbRecord: PaymentSettings | null = null;
  const localRecord = readLocalPaymentSettings();

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      const rows = await db
        .select()
        .from(paymentSettings)
        .where(eq(paymentSettings.id, 'default'))
        .limit(1)
        .execute();
      if (rows && rows.length > 0) {
        dbRecord = rows[0];
      }
    } catch {
      markDatabaseOffline();
    }
  }

  const mergedCms = dbRecord || localRecord;

  const envAccessToken = (process.env.MP_ACCESS_TOKEN || '').trim();
  const envPublicKey = (process.env.PUBLIC_MP_PUBLIC_KEY || process.env.MP_PUBLIC_KEY || '').trim();
  const envWebhookSecret = (process.env.MP_WEBHOOK_SECRET || '').trim();
  const envStorefrontUrl = (
    process.env.PUBLIC_STOREFRONT_URL ||
    fallbackOrigin ||
    'http://localhost:4321'
  ).trim();

  const cmsHasToken = isTokenConfigured(mergedCms?.mpAccessToken);
  const envHasToken = isTokenConfigured(envAccessToken);

  const mpAccessToken = cmsHasToken
    ? (mergedCms?.mpAccessToken || '').trim()
    : envHasToken
      ? envAccessToken
      : (mergedCms?.mpAccessToken || '').trim();

  const mpPublicKey = (mergedCms?.mpPublicKey || envPublicKey || '').trim();
  const mpWebhookSecret = (mergedCms?.mpWebhookSecret || envWebhookSecret || '').trim();
  const storefrontUrl = (mergedCms?.storefrontUrl || envStorefrontUrl)
    .trim()
    .replace(/\/+$/, '');
  const statementDescriptor = (mergedCms?.statementDescriptor || 'TIENDA ONLINE')
    .trim()
    .slice(0, 13)
    .toUpperCase();
  const binaryMode = Boolean(mergedCms?.binaryMode ?? false);

  const detectedMode: 'sandbox' | 'production' =
    mpAccessToken.startsWith('TEST-')
      ? 'sandbox'
      : mergedCms?.mpMode === 'sandbox'
        ? 'sandbox'
        : 'production';

  const hasValidToken = isTokenConfigured(mpAccessToken);
  const mpEnabled =
    mergedCms?.mpEnabled !== undefined
      ? Boolean(mergedCms.mpEnabled)
      : hasValidToken;

  const source: 'cms' | 'env' | 'demo' =
    cmsHasToken && mpEnabled
      ? 'cms'
      : envHasToken && mpEnabled
        ? 'env'
        : 'demo';

  return {
    id: 'default',
    mpEnabled,
    mpMode: detectedMode,
    mpPublicKey,
    mpAccessToken,
    mpWebhookSecret,
    storefrontUrl,
    statementDescriptor,
    binaryMode,
    source,
    isLiveReady: Boolean(mpEnabled && hasValidToken),
    updatedAt: mergedCms?.updatedAt ? new Date(mergedCms.updatedAt).toISOString() : undefined,
  };
}

/**
 * Guarda la configuración de Mercado Pago tanto en el almacenamiento compartido como en PostgreSQL
 */
export async function saveStoredPaymentSettings(input: {
  mpEnabled: boolean;
  mpMode: 'sandbox' | 'production';
  mpPublicKey: string;
  mpAccessToken: string;
  mpWebhookSecret: string;
  storefrontUrl: string;
  statementDescriptor: string;
  binaryMode: boolean;
}): Promise<StoredPaymentConfig> {
  const cleanAccessToken = input.mpAccessToken.trim();
  const cleanPublicKey = input.mpPublicKey.trim();
  const cleanWebhookSecret = input.mpWebhookSecret.trim();
  const cleanStorefrontUrl = input.storefrontUrl.trim().replace(/\/+$/, '');
  const cleanDescriptor = (input.statementDescriptor || 'TIENDA ONLINE')
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .slice(0, 13)
    .toUpperCase();

  const recordToSave: Partial<PaymentSettings> = {
    id: 'default',
    mpEnabled: Boolean(input.mpEnabled),
    mpMode: cleanAccessToken.startsWith('TEST-') ? 'sandbox' : input.mpMode,
    mpPublicKey: cleanPublicKey,
    mpAccessToken: cleanAccessToken,
    mpWebhookSecret: cleanWebhookSecret,
    storefrontUrl: cleanStorefrontUrl,
    statementDescriptor: cleanDescriptor || 'TIENDA ONLINE',
    binaryMode: Boolean(input.binaryMode),
    updatedAt: new Date(),
  };

  writeLocalPaymentSettings(recordToSave);

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      const existing = await db
        .select()
        .from(paymentSettings)
        .where(eq(paymentSettings.id, 'default'))
        .limit(1)
        .execute();

      if (existing.length > 0) {
        await db
          .update(paymentSettings)
          .set({
            mpEnabled: recordToSave.mpEnabled!,
            mpMode: recordToSave.mpMode!,
            mpPublicKey: recordToSave.mpPublicKey,
            mpAccessToken: recordToSave.mpAccessToken,
            mpWebhookSecret: recordToSave.mpWebhookSecret,
            storefrontUrl: recordToSave.storefrontUrl,
            statementDescriptor: recordToSave.statementDescriptor!,
            binaryMode: recordToSave.binaryMode!,
            updatedAt: new Date(),
          })
          .where(eq(paymentSettings.id, 'default'));
      } else {
        await db.insert(paymentSettings).values({
          id: 'default',
          mpEnabled: recordToSave.mpEnabled!,
          mpMode: recordToSave.mpMode!,
          mpPublicKey: recordToSave.mpPublicKey,
          mpAccessToken: recordToSave.mpAccessToken,
          mpWebhookSecret: recordToSave.mpWebhookSecret,
          storefrontUrl: recordToSave.storefrontUrl,
          statementDescriptor: recordToSave.statementDescriptor!,
          binaryMode: recordToSave.binaryMode!,
          updatedAt: new Date(),
        });
      }
    } catch (err) {
      markDatabaseOffline();
      console.warn('Aviso guardando payment_settings en PostgreSQL, persistido en store local:', err);
    }
  }

  return getStoredPaymentSettings();
}

