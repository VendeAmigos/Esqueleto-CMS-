'use client';

import React, { useState, useTransition } from 'react';
import { savePaymentGatewaySettings, testMercadoPagoTokenAction } from './actions';

export interface PaymentConfigProps {
  id: string;
  mpEnabled: boolean;
  mpMode: 'sandbox' | 'production';
  mpPublicKey: string;
  mpAccessTokenMasked: string;
  hasAccessToken: boolean;
  mpWebhookSecretMasked: string;
  hasWebhookSecret: boolean;
  storefrontUrl: string;
  statementDescriptor: string;
  binaryMode: boolean;
  source: 'cms' | 'env' | 'demo';
  isLiveReady: boolean;
  updatedAt?: string;
}

export default function PaymentSettingsManager({
  initialConfig,
}: {
  initialConfig: PaymentConfigProps;
}) {
  const [mpEnabled, setMpEnabled] = useState(initialConfig.mpEnabled);
  const [mpMode, setMpMode] = useState<'sandbox' | 'production'>(initialConfig.mpMode);
  const [mpPublicKey, setMpPublicKey] = useState(initialConfig.mpPublicKey);
  const [mpAccessToken, setMpAccessToken] = useState(
    initialConfig.hasAccessToken ? '••••••••' : ''
  );
  const [mpWebhookSecret, setMpWebhookSecret] = useState(
    initialConfig.hasWebhookSecret ? '••••••••' : ''
  );
  const [storefrontUrl, setStorefrontUrl] = useState(
    initialConfig.storefrontUrl || 'https://mitienda.com'
  );
  const [statementDescriptor, setStatementDescriptor] = useState(
    initialConfig.statementDescriptor || 'TIENDA ONLINE'
  );
  const [binaryMode, setBinaryMode] = useState(initialConfig.binaryMode);

  const [showToken, setShowToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const [isSaving, startSaveTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [verifiedAccount, setVerifiedAccount] = useState<{
    id: number | string;
    nickname: string;
    email: string;
    firstName: string;
    lastName: string;
    countryId: string;
    mode: 'sandbox' | 'production';
  } | null>(null);

  const cleanStoreUrl = (storefrontUrl || 'https://mitienda.com').trim().replace(/\/+$/, '');
  const webhookUrl = `${cleanStoreUrl}/api/webhook`;

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleTestConnection = () => {
    setFeedback(null);
    startTestTransition(async () => {
      const result = await testMercadoPagoTokenAction(mpAccessToken);
      if (result.success && result.account) {
        setVerifiedAccount(result.account);
        setMpMode(result.account.mode);
        setFeedback({
          type: 'success',
          message: `Conexión exitosa con Mercado Pago (${result.account.nickname} • ID ${result.account.id})`,
        });
      } else {
        setVerifiedAccount(null);
        setFeedback({
          type: 'error',
          message: result.error || 'No se pudo verificar el Access Token.',
        });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.set('mpEnabled', String(mpEnabled));
    formData.set('mpMode', mpMode);
    formData.set('mpPublicKey', mpPublicKey);
    formData.set('mpAccessToken', mpAccessToken);
    formData.set('mpWebhookSecret', mpWebhookSecret);
    formData.set('storefrontUrl', cleanStoreUrl);
    formData.set('statementDescriptor', statementDescriptor);
    formData.set('binaryMode', String(binaryMode));

    startSaveTransition(async () => {
      const res = await savePaymentGatewaySettings(formData);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Configuración de pasarela de pagos guardada y activa en la tienda.',
        });
        if (mpAccessToken && mpAccessToken !== '••••••••') {
          setMpAccessToken('••••••••');
          setShowToken(false);
        }
        if (mpWebhookSecret && mpWebhookSecret !== '••••••••') {
          setMpWebhookSecret('••••••••');
          setShowWebhookSecret(false);
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Error al guardar la configuración.',
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. Banner de Estado en Vivo */}
      <div
        className={`rounded-2xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          mpEnabled && (initialConfig.hasAccessToken || mpAccessToken.length > 20)
            ? mpMode === 'production'
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50/70 border-amber-200'
            : 'bg-slate-100 border-slate-200'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg ${
              mpEnabled && (initialConfig.hasAccessToken || mpAccessToken.length > 20)
                ? mpMode === 'production'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 text-white'
                : 'bg-slate-700 text-white'
            }`}
          >
            MP
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                {mpEnabled && (initialConfig.hasAccessToken || mpAccessToken.length > 20)
                  ? mpMode === 'production'
                    ? 'Mercado Pago Activo — Modo Producción (Cobros Reales)'
                    : 'Mercado Pago Activo — Modo Sandbox (Pruebas)'
                  : 'Modo Simulación / Demo Activo (Sin cobros reales)'}
              </h2>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  mpEnabled && (initialConfig.hasAccessToken || mpAccessToken.length > 20)
                    ? mpMode === 'production'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {initialConfig.source === 'cms'
                  ? 'Configurado en CMS'
                  : initialConfig.source === 'env'
                    ? 'Leído de .env'
                    : 'Simulación Local'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {mpEnabled && (initialConfig.hasAccessToken || mpAccessToken.length > 20)
                ? 'Los clientes son redirigidos de forma segura a Checkout Pro de Mercado Pago (Tarjetas, Saldo MP, Meses y Efectivo/OXXO/SPEI).'
                : 'Las compras de prueba se aprueban automáticamente sin pasar por banco. Ideal para demostrar el sistema a nuevos clientes antes de conectar su cuenta.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 transition shrink-0"
        >
          {showGuide ? 'Ocultar Guía Paso a Paso' : 'Ver Guía para Clientes'}
        </button>
      </div>

      {/* 2. Guía Interactiva Paso a Paso para el Cliente */}
      {showGuide && (
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                Guía Rápida de Autoconfiguración (Sin código)
              </span>
              <h3 className="text-base font-bold mt-0.5">
                ¿Cómo conectar tu cuenta de Mercado Pago en 3 minutos?
              </h3>
            </div>
            <a
              href="https://www.mercadopago.com.mx/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition flex items-center gap-1.5"
            >
              <span>Abrir Panel de Mercado Pago</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Paso 1 */}
            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-6 w-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h4 className="font-bold text-sm text-gray-900">Crear Aplicación</h4>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Entra a{' '}
                  <a
                    href="https://www.mercadopago.com.mx/developers/panel/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 font-semibold underline"
                  >
                    Mercado Pago Developers
                  </a>{' '}
                  con la cuenta donde recibirás tu dinero. Haz clic en{' '}
                  <strong>&ldquo;Crear aplicación&rdquo;</strong>, ponle el nombre de tu tienda y elige{' '}
                  <strong>Pagos online &rarr; Checkout Pro</strong>.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200 text-[11px] text-gray-500">
                ¿No pide sitio web aún? Puedes poner el dominio de tu tienda.
              </div>
            </div>

            {/* Paso 2 */}
            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-6 w-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h4 className="font-bold text-sm text-gray-900">Copiar Credenciales</h4>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  En el menú izquierdo de tu aplicación en Mercado Pago, entra a{' '}
                  <strong>&ldquo;Credenciales de producción&rdquo;</strong>, selecciona tu giro comercial y activa las credenciales. Copia el{' '}
                  <strong>Public Key</strong> y el <strong>Access Token</strong> (empiezan con{' '}
                  <code className="bg-gray-200 px-1 rounded">APP_USR-</code>).
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200 text-[11px] text-gray-500">
                Para pruebas sin dinero real usa &ldquo;Credenciales de prueba&rdquo; (<code className="bg-gray-200 px-1 rounded">TEST-</code>).
              </div>
            </div>

            {/* Paso 3 */}
            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-6 w-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h4 className="font-bold text-sm text-gray-900">Activar Webhook</h4>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  En el menú izquierdo de Mercado Pago ve a <strong>&ldquo;Webhooks&rdquo; &rarr; &ldquo;Configurar notificaciones&rdquo;</strong>. Pega esta URL en Modo Producción, selecciona el evento{' '}
                  <strong>&ldquo;Pagos&rdquo; (payment)</strong> y guarda:
                </p>
                <div className="mt-2 flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg p-1.5">
                  <code className="text-[11px] text-gray-800 truncate flex-1">
                    {webhookUrl}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="px-2 py-1 rounded bg-black text-white text-[10px] font-bold hover:bg-gray-800 shrink-0"
                  >
                    {copiedWebhook ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200 text-[11px] text-gray-500">
                Al guardar, Mercado Pago te mostrará una <strong>Clave secreta</strong>: pégala abajo.
              </div>
            </div>

            {/* Paso 4 */}
            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-6 w-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <h4 className="font-bold text-sm text-gray-900">Verificar y Activar</h4>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Pega tu <strong>Access Token</strong> abajo, haz clic en{' '}
                  <strong>&ldquo;Probar Conexión con Mercado Pago&rdquo;</strong> para confirmar que tu cuenta responde y finalmente presiona{' '}
                  <strong>&ldquo;Guardar Configuración&rdquo;</strong>.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200 text-[11px] text-emerald-700 font-semibold">
                ¡Listo! Los pagos llegarán directo a tu cuenta de Mercado Pago.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Formulario Principal de Configuración */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Credenciales de Mercado Pago y Punto de Venta
            </h3>
            <p className="text-sm text-gray-500">
              Estos datos se guardan de forma segura en el servidor y actualizan el checkout al instante.
            </p>
          </div>

          {/* Toggle Habilitar Pasarela Real */}
          <label className="inline-flex items-center gap-3 cursor-pointer select-none bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200">
            <input
              type="checkbox"
              checked={mpEnabled}
              onChange={(e) => setMpEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative peer-checked:bg-emerald-600" />
            <span className="text-sm font-bold text-gray-900">
              {mpEnabled ? 'Cobros con Mercado Pago Habilitados' : 'Modo Demo (Sin cobro real)'}
            </span>
          </label>
        </div>

        {/* Notificación de Feedback */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-bold underline ml-4"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Tarjeta de Cuenta Verificada */}
        {verifiedAccount && (
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                Cuenta Vinculada Verificada en Mercado Pago
              </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {verifiedAccount.firstName} {verifiedAccount.lastName} ({verifiedAccount.nickname}) — {verifiedAccount.email}
              </p>
              <p className="text-xs text-gray-600">
                ID de Usuario MP: <strong>{verifiedAccount.id}</strong> • País: <strong>{verifiedAccount.countryId}</strong> • Entorno detectado:{' '}
                <strong>{verifiedAccount.mode === 'production' ? 'Producción (Real)' : 'Sandbox (Pruebas)'}</strong>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Modo de Operación */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Entorno de Credenciales
            </label>
            <select
              value={mpMode}
              onChange={(e) => setMpMode(e.target.value as 'sandbox' | 'production')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium focus:outline-none focus:border-black"
            >
              <option value="production">Producción — Cobros Reales (APP_USR-...)</option>
              <option value="sandbox">Sandbox — Pruebas de Desarrollo (TEST-...)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              El sistema también detecta automáticamente si tu token comienza con <code>TEST-</code> o <code>APP_USR-</code>.
            </p>
          </div>

          {/* URL Pública de la Tienda */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              URL Pública de la Tienda (Dominio del Cliente)
            </label>
            <input
              type="url"
              value={storefrontUrl}
              onChange={(e) => setStorefrontUrl(e.target.value)}
              placeholder="https://mitienda.com"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se usa para regresar al comprador tras el pago y recibir notificaciones en{' '}
              <code className="text-gray-700">{webhookUrl}</code>.
            </p>
          </div>

          {/* Public Key */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Public Key (Clave Pública)
            </label>
            <input
              type="text"
              value={mpPublicKey}
              onChange={(e) => setMpPublicKey(e.target.value)}
              placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-mono focus:outline-none focus:border-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              Identificador público de tu aplicación en Mercado Pago Developers.
            </p>
          </div>

          {/* Access Token */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Access Token (Token Secreto de Cobro) *
              </label>
              <button
                type="button"
                onClick={() => {
                  if (mpAccessToken === '••••••••') setMpAccessToken('');
                  setShowToken((v) => !v);
                }}
                className="text-xs font-semibold text-sky-600 hover:underline"
              >
                {mpAccessToken === '••••••••'
                  ? 'Reemplazar Token'
                  : showToken
                    ? 'Ocultar'
                    : 'Mostrar'}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type={showToken ? 'text' : 'password'}
                value={mpAccessToken}
                onChange={(e) => setMpAccessToken(e.target.value)}
                placeholder="APP_USR-0000000000000000-000000-xxxxxxxxxxxxxxxx-000000000"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-mono focus:outline-none focus:border-black"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shrink-0 disabled:opacity-50"
              >
                {isTesting ? 'Verificando...' : 'Probar Conexión'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {initialConfig.hasAccessToken && mpAccessToken === '••••••••'
                ? `Token actual guardado (${initialConfig.mpAccessTokenMasked}). Déjalo así para conservarlo o haz clic en "Reemplazar Token".`
                : 'Pega aquí el Access Token de Producción o Prueba desde Mercado Pago Developers.'}
            </p>
          </div>

          {/* Webhook Secret */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Clave Secreta del Webhook (Secret Signature)
              </label>
              <button
                type="button"
                onClick={() => {
                  if (mpWebhookSecret === '••••••••') setMpWebhookSecret('');
                  setShowWebhookSecret((v) => !v);
                }}
                className="text-xs font-semibold text-sky-600 hover:underline"
              >
                {mpWebhookSecret === '••••••••'
                  ? 'Reemplazar Clave'
                  : showWebhookSecret
                    ? 'Ocultar'
                    : 'Mostrar'}
              </button>
            </div>
            <input
              type={showWebhookSecret ? 'text' : 'password'}
              value={mpWebhookSecret}
              onChange={(e) => setMpWebhookSecret(e.target.value)}
              placeholder="Opcional: Clave secreta generada en la sección Webhooks de MP"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-mono focus:outline-none focus:border-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              Valida criptográficamente (HMAC-SHA256) que las notificaciones de pago provengan de Mercado Pago.
            </p>
          </div>

          {/* Statement Descriptor */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Nombre en Estado de Cuenta Bancario (Máx. 13 letras)
            </label>
            <input
              type="text"
              maxLength={13}
              value={statementDescriptor}
              onChange={(e) => setStatementDescriptor(e.target.value.toUpperCase())}
              placeholder="MITIENDA"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-mono uppercase focus:outline-none focus:border-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nombre corto que verá tu cliente en el resumen de su tarjeta de crédito/débito.
            </p>
          </div>
        </div>

        {/* Opción Binary Mode */}
        <div className="pt-2 border-t border-gray-100 flex items-start gap-3">
          <input
            id="binaryMode"
            type="checkbox"
            checked={binaryMode}
            onChange={(e) => setBinaryMode(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <div>
            <label htmlFor="binaryMode" className="text-sm font-bold text-gray-900 cursor-pointer">
              Activar Modo Binario (Solo pagos de acreditación instantánea)
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              Si está desactivado (recomendado en México), tus clientes también pueden pagar en efectivo en OXXO, 7-Eleven, SPEI y PayCash. Si lo activas, solo se aceptan pagos con aprobación inmediata.
            </p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 font-bold text-sm transition disabled:opacity-50"
          >
            {isTesting ? 'Probando...' : 'Probar Conexión con Mercado Pago'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white font-bold text-sm transition disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}

