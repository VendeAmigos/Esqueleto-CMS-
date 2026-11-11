import { getStoredPaymentSettings } from '@esqueleto/core';
import PaymentSettingsManager from './PaymentSettingsManager';

export const dynamic = 'force-dynamic';

function maskSecret(secret: string): string {
  if (!secret || secret.length < 12) return '';
  return `${secret.slice(0, 8)}••••••••${secret.slice(-4)}`;
}

export default async function PagosPage() {
  const config = await getStoredPaymentSettings();

  const initialProps = {
    id: config.id,
    mpEnabled: config.mpEnabled,
    mpMode: config.mpMode,
    mpPublicKey: config.mpPublicKey,
    mpAccessTokenMasked: maskSecret(config.mpAccessToken),
    hasAccessToken: Boolean(config.mpAccessToken && config.mpAccessToken.length > 20),
    mpWebhookSecretMasked: maskSecret(config.mpWebhookSecret),
    hasWebhookSecret: Boolean(config.mpWebhookSecret && config.mpWebhookSecret.length > 6),
    storefrontUrl: config.storefrontUrl,
    statementDescriptor: config.statementDescriptor,
    binaryMode: config.binaryMode,
    source: config.source,
    isLiveReady: config.isLiveReady,
    updatedAt: config.updatedAt,
  };

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md">
            Pasarela de Cobros &bull; Multi-Cliente
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">
            Configuración de Mercado Pago
          </h1>
          <p className="mt-2 text-sm text-gray-500 max-w-3xl">
            Conecta la cuenta de Mercado Pago del negocio sin tocar código ni servidores. Incluye guía paso a paso para tus clientes y verificador de credenciales en tiempo real.
          </p>
        </div>
      </div>

      <PaymentSettingsManager initialConfig={initialProps} />
    </main>
  );
}

