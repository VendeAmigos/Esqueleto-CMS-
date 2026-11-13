'use client';

import { useState, useRef, useEffect } from 'react';
import type { StoredSiteAppearance } from '@esqueleto/core';
import { updateSiteSettings } from './actions';

interface AppearanceFormProps {
  initialSettings: StoredSiteAppearance;
}

type TabId = 'brand' | 'hero' | 'home' | 'commerce' | 'contact' | 'seo';

const TABS: { id: TabId; label: string; short: string }[] = [
  { id: 'brand', label: '1. Marca, Colores & Tema', short: 'Marca & Tema' },
  { id: 'hero', label: '2. Tipografía & Hero', short: 'Fuentes & Hero' },
  { id: 'home', label: '3. Secciones de Portada', short: 'Portada' },
  { id: 'commerce', label: '4. Moneda, Envío & Pickup', short: 'Moneda & Envío' },
  { id: 'contact', label: '5. Anuncios, Contacto & Políticas', short: 'Contacto & Legal' },
  { id: 'seo', label: '6. SEO & Analítica', short: 'SEO' },
];

const COLOR_PRESETS = [
  { name: 'Rosa Estudio', hex: '#ec4899' },
  { name: 'Índigo Royal', hex: '#4f46e5' },
  { name: 'Violeta Neón', hex: '#7c3aed' },
  { name: 'Esmeralda Pro', hex: '#059669' },
  { name: 'Negro Pitch', hex: '#111827' },
  { name: 'Ámbar Cálido', hex: '#d97706' },
  { name: 'Rojo Carmesí', hex: '#dc2626' },
  { name: 'Azul Eléctrico', hex: '#2563eb' },
];

const CURRENCY_OPTIONS = [
  { code: 'MXN', locale: 'es-MX', label: 'MXN — Peso Mexicano ($)' },
  { code: 'USD', locale: 'en-US', label: 'USD — Dólar EE.UU. ($)' },
  { code: 'COP', locale: 'es-CO', label: 'COP — Peso Colombiano ($)' },
  { code: 'ARS', locale: 'es-AR', label: 'ARS — Peso Argentino ($)' },
  { code: 'CLP', locale: 'es-CL', label: 'CLP — Peso Chileno ($)' },
  { code: 'PEN', locale: 'es-PE', label: 'PEN — Sol Peruano (S/)' },
  { code: 'EUR', locale: 'es-ES', label: 'EUR — Euro (€)' },
];

const FONT_OPTIONS = [
  { name: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Geométrica Moderna)' },
  { name: 'Inter', label: 'Inter (Minimalista & Ultra Legible)' },
  { name: 'Fraunces', label: 'Fraunces (Editorial & Estudio de Arte)' },
  { name: 'Playfair Display', label: 'Playfair Display (Boutique & Lujo Serif)' },
  { name: 'Cormorant Garamond', label: 'Cormorant Garamond (Clásica & Galería)' },
  { name: 'Space Grotesk', label: 'Space Grotesk (Vanguardista & Streetwear)' },
  { name: 'Montserrat', label: 'Montserrat (Comercial & Versátil)' },
  { name: 'DM Sans', label: 'DM Sans (Amigable & Redondeada)' },
  { name: 'Lora', label: 'Lora (Cálida & Literaria)' },
  { name: 'Outfit', label: 'Outfit (Contemporánea & Limpia)' },
];

const TYPOGRAPHY_PRESETS = [
  {
    title: 'Estudio de Arte & Ilustración',
    heading: 'Fraunces',
    body: 'Plus Jakarta Sans',
  },
  {
    title: 'Boutique & Joyería Luxury',
    heading: 'Playfair Display',
    body: 'Lora',
  },
  {
    title: 'Streetwear & Diseño Urbano',
    heading: 'Space Grotesk',
    body: 'DM Sans',
  },
  {
    title: 'Minimalista Contemporáneo',
    heading: 'Plus Jakarta Sans',
    body: 'Inter',
  },
];

const DEFAULT_SVG_PRESET = `<svg viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;

function getContrastText(hex: string): '#111827' | '#ffffff' {
  const clean = (hex || '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '#ffffff';
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(parseInt(clean.slice(0, 2), 16));
  const g = toLinear(parseInt(clean.slice(2, 4), 16));
  const b = toLinear(parseInt(clean.slice(4, 6), 16));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const cw = 1.05 / (L + 0.05);
  const cd = (L + 0.05) / 0.0518;
  return cd > cw ? '#111827' : '#ffffff';
}

function sanitizeClientSvg(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(width|height)="[^"]*"/gi, '')
    .trim();
}

export default function AppearanceForm({ initialSettings }: AppearanceFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>('brand');

  // 1. Marca, Colores & Tema
  const [siteName, setSiteName] = useState(initialSettings.siteName || 'LUNA ART STUDIO');
  const [logoSvg, setLogoSvg] = useState(initialSettings.logoSvg || '');
  const [logoColor, setLogoColor] = useState(initialSettings.logoColor || '#ec4899');
  const [accentColor, setAccentColor] = useState(initialSettings.accentColor || '#6366f1');
  const [backgroundColor, setBackgroundColor] = useState(initialSettings.backgroundColor || '#f9fafb');
  const [surfaceColor, setSurfaceColor] = useState(initialSettings.surfaceColor || '#ffffff');
  const [textColor, setTextColor] = useState(initialSettings.textColor || '#111827');
  const [colorTheme, setColorTheme] = useState<'light' | 'dark' | 'auto'>(initialSettings.colorTheme || 'light');
  const [cardRadius, setCardRadius] = useState<'none' | 'soft' | 'rounded' | 'pill'>(
    initialSettings.cardRadius || 'rounded'
  );
  const [buttonStyle, setButtonStyle] = useState<'solid' | 'outline'>(initialSettings.buttonStyle || 'solid');

  // 2. Tipografía & Hero
  const [headingFont, setHeadingFont] = useState(initialSettings.headingFont || 'Plus Jakarta Sans');
  const [bodyFont, setBodyFont] = useState(initialSettings.bodyFont || 'Inter');
  const [fontScale, setFontScale] = useState<'compact' | 'normal' | 'editorial'>(
    initialSettings.fontScale || 'normal'
  );
  const [fontWeights, setFontWeights] = useState(initialSettings.fontWeights || '400;500;600;700;800');
  const [heroTitle, setHeroTitle] = useState(initialSettings.heroTitle || '');
  const [heroSubtitle, setHeroSubtitle] = useState(initialSettings.heroSubtitle || '');
  const [heroImageUrl, setHeroImageUrl] = useState(initialSettings.heroImageUrl || '');
  const [heroCtaText, setHeroCtaText] = useState(initialSettings.heroCtaText || 'Explorar Catálogo');
  const [heroCtaLink, setHeroCtaLink] = useState(initialSettings.heroCtaLink || '/catalogo');

  // 3. Secciones de portada
  const [categoriesBadge, setCategoriesBadge] = useState(initialSettings.categoriesBadge || '');
  const [categoriesTitle, setCategoriesTitle] = useState(initialSettings.categoriesTitle || '');
  const [categoriesSubtitle, setCategoriesSubtitle] = useState(initialSettings.categoriesSubtitle || '');
  const [featuredBadge, setFeaturedBadge] = useState(initialSettings.featuredBadge || '');
  const [featuredTitle, setFeaturedTitle] = useState(initialSettings.featuredTitle || '');
  const [featuredSubtitle, setFeaturedSubtitle] = useState(initialSettings.featuredSubtitle || '');
  const [trust1Title, setTrust1Title] = useState(initialSettings.trust1Title || '');
  const [trust1Desc, setTrust1Desc] = useState(initialSettings.trust1Desc || '');
  const [trust2Title, setTrust2Title] = useState(initialSettings.trust2Title || '');
  const [trust2Desc, setTrust2Desc] = useState(initialSettings.trust2Desc || '');
  const [trust3Title, setTrust3Title] = useState(initialSettings.trust3Title || '');
  const [trust3Desc, setTrust3Desc] = useState(initialSettings.trust3Desc || '');

  // 4. Moneda, Envío & Pickup
  const [currencyCode, setCurrencyCode] = useState(initialSettings.currencyCode || 'MXN');
  const [currencyLocale, setCurrencyLocale] = useState(initialSettings.currencyLocale || 'es-MX');
  const [shippingFee, setShippingFee] = useState(
    String(((initialSettings.shippingFeeCents || 0) / 100).toFixed(2))
  );
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    initialSettings.freeShippingThresholdCents != null
      ? String((initialSettings.freeShippingThresholdCents / 100).toFixed(2))
      : ''
  );
  const [pickupEnabled, setPickupEnabled] = useState(Boolean(initialSettings.pickupEnabled));
  const [pickupAddress, setPickupAddress] = useState(initialSettings.pickupAddress || '');

  // 5. Anuncios, Contacto, Redes & Políticas
  const [announcementEnabled, setAnnouncementEnabled] = useState(Boolean(initialSettings.announcementEnabled));
  const [announcementText, setAnnouncementText] = useState(initialSettings.announcementText || '');
  const [announcementLink, setAnnouncementLink] = useState(initialSettings.announcementLink || '/catalogo');
  const [announcementBg, setAnnouncementBg] = useState(initialSettings.announcementBg || '#111827');
  const [contactTitle, setContactTitle] = useState(initialSettings.contactTitle || '');
  const [contactSubtitle, setContactSubtitle] = useState(initialSettings.contactSubtitle || '');
  const [contactEmail, setContactEmail] = useState(initialSettings.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(initialSettings.contactPhone || '');
  const [contactAddress, setContactAddress] = useState(initialSettings.contactAddress || '');
  const [contactHours, setContactHours] = useState(initialSettings.contactHours || '');
  const [instagramUrl, setInstagramUrl] = useState(initialSettings.instagramUrl || '');
  const [tiktokUrl, setTiktokUrl] = useState(initialSettings.tiktokUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(initialSettings.facebookUrl || '');
  const [whatsappEnabled, setWhatsappEnabled] = useState(Boolean(initialSettings.whatsappEnabled));
  const [whatsappNumber, setWhatsappNumber] = useState(initialSettings.whatsappNumber || '');
  const [whatsappMessage, setWhatsappMessage] = useState(initialSettings.whatsappMessage || '');
  const [shippingPolicyText, setShippingPolicyText] = useState(initialSettings.shippingPolicyText || '');
  const [returnsPolicyText, setReturnsPolicyText] = useState(initialSettings.returnsPolicyText || '');
  const [privacyPolicyText, setPrivacyPolicyText] = useState(initialSettings.privacyPolicyText || '');

  // 6. SEO & Analítica
  const [seoTitleSuffix, setSeoTitleSuffix] = useState(initialSettings.seoTitleSuffix || '');
  const [seoDescription, setSeoDescription] = useState(initialSettings.seoDescription || '');
  const [faviconUrl, setFaviconUrl] = useState(initialSettings.faviconUrl || '');
  const [ogImageUrl, setOgImageUrl] = useState(initialSettings.ogImageUrl || '');
  const [ga4MeasurementId, setGa4MeasurementId] = useState(initialSettings.ga4MeasurementId || '');
  const [metaPixelId, setMetaPixelId] = useState(initialSettings.metaPixelId || '');

  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [svgFileName, setSvgFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [stats, setStats] = useState<{ original: string; compressed: string; savings: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgFileInputRef = useRef<HTMLInputElement>(null);

  const ctaContrastText = getContrastText(logoColor);
  const announcementContrastText = getContrastText(announcementBg);

  useEffect(() => {
    const fonts = Array.from(new Set([headingFont, bodyFont]));
    const familyQuery = fonts
      .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`)
      .join('&');
    const href = `https://fonts.googleapis.com/css2?${familyQuery}&display=swap`;

    let linkEl = document.getElementById('cms-dynamic-google-fonts') as HTMLLinkElement | null;
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.id = 'cms-dynamic-google-fonts';
      linkEl.rel = 'stylesheet';
      document.head.appendChild(linkEl);
    }
    linkEl.href = href;
  }, [headingFont, bodyFont]);

  const handleSvgFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      setSaveStatus({ success: false, msg: 'Selecciona un archivo con extensión .svg válida.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = String(e.target?.result || '');
      const svgMatch = raw.match(/<svg[\s\S]*?<\/svg>/i);
      if (!svgMatch) {
        setSaveStatus({ success: false, msg: 'El archivo no contiene una etiqueta <svg> válida.' });
        return;
      }

      setLogoSvg(sanitizeClientSvg(svgMatch[0]));
      setSvgFileName(file.name);
      setSaveStatus(null);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const applyCurrentColorToSvg = () => {
    if (!logoSvg.trim()) return;
    let updated = logoSvg.replace(/fill="(?!none)[^"]*"/gi, 'fill="currentColor"');
    if (!/fill=/i.test(updated)) {
      updated = updated.replace(/<svg/i, '<svg fill="currentColor"');
    }
    setLogoSvg(updated);
  };

  const compressImage = async (file: File): Promise<{ blob: Blob; origKb: number; compKb: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDimension = 1920;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas no soportado'));

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  blob,
                  origKb: Math.round(file.size / 1024),
                  compKb: Math.round(blob.size / 1024),
                });
              } else {
                reject(new Error('Error en compresión'));
              }
            },
            'image/webp',
            0.85
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSaveStatus({ success: false, msg: 'Solo se permiten archivos de imagen.' });
      return;
    }

    try {
      setIsCompressing(true);
      const { blob, origKb, compKb } = await compressImage(file);
      const savingPercent = origKb > 0 ? Math.round(((origKb - compKb) / origKb) * 100) : 0;
      setStats({
        original: `${origKb} KB`,
        compressed: `${compKb} KB`,
        savings: savingPercent,
      });

      const formData = new FormData();
      formData.append('file', blob, 'hero-banner.webp');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Error al subir la imagen comprimida');
      const data = await response.json();
      setHeroImageUrl(data.url);
    } catch (err: any) {
      console.error(err);
      setSaveStatus({ success: false, msg: 'Fallo al comprimir y subir imagen: ' + err.message });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveStatus(null);

    const formData = new FormData();
    const fields: Record<string, string> = {
      siteName,
      logoSvg,
      logoColor,
      accentColor,
      backgroundColor,
      surfaceColor,
      textColor,
      colorTheme,
      cardRadius,
      buttonStyle,
      headingFont,
      bodyFont,
      fontScale,
      fontWeights,
      heroTitle,
      heroSubtitle,
      heroImageUrl,
      heroCtaText,
      heroCtaLink,
      categoriesBadge,
      categoriesTitle,
      categoriesSubtitle,
      featuredBadge,
      featuredTitle,
      featuredSubtitle,
      trust1Title,
      trust1Desc,
      trust2Title,
      trust2Desc,
      trust3Title,
      trust3Desc,
      currencyCode,
      currencyLocale,
      shippingFee,
      freeShippingThreshold,
      pickupEnabled: pickupEnabled ? 'true' : 'false',
      pickupAddress,
      announcementEnabled: announcementEnabled ? 'true' : 'false',
      announcementText,
      announcementLink,
      announcementBg,
      contactTitle,
      contactSubtitle,
      contactEmail,
      contactPhone,
      contactAddress,
      contactHours,
      instagramUrl,
      tiktokUrl,
      facebookUrl,
      whatsappEnabled: whatsappEnabled ? 'true' : 'false',
      whatsappNumber,
      whatsappMessage,
      shippingPolicyText,
      returnsPolicyText,
      privacyPolicyText,
      seoTitleSuffix,
      seoDescription,
      faviconUrl,
      ogImageUrl,
      ga4MeasurementId,
      metaPixelId,
    };

    for (const [k, v] of Object.entries(fields)) {
      formData.append(k, v);
    }

    const res = await updateSiteSettings(formData);
    setIsSubmitting(false);

    if (res.success) {
      setSaveStatus({
        success: true,
        msg: '¡Todos los parámetros de diseño, tienda y CMS se guardaron correctamente!',
      });
      setTimeout(() => setSaveStatus(null), 5000);
    } else {
      setSaveStatus({ success: false, msg: res.error || 'Error al guardar la configuración.' });
    }
  };

  const previewRadiusClass =
    cardRadius === 'none'
      ? 'rounded-none'
      : cardRadius === 'soft'
        ? 'rounded-lg'
        : cardRadius === 'pill'
          ? 'rounded-3xl'
          : 'rounded-2xl';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20">
      {saveStatus && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between gap-4 shadow-sm transition-all ${
            saveStatus.success
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{saveStatus.msg}</span>
          <button
            type="button"
            onClick={() => setSaveStatus(null)}
            className="text-xs underline shrink-0 hover:opacity-80"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* NAVEGACIÓN DE PESTAÑAS RESPONSIVE */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: MARCA, COLORES & TEMA */}
      <section className={activeTab === 'brand' ? 'space-y-6' : 'hidden'}>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900">1. Logotipo (.SVG), Colores y Tema</h2>
            <p className="text-sm text-gray-500 mt-1">
              Sube tu logotipo vectorial y define la paleta de marca, tema visual y geometría de tarjetas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Nombre de la Tienda</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Ej. LUNA DE COCO"
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm focus:border-black focus:ring-black sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-sm font-semibold text-gray-700">Archivo de Logotipo (.SVG)</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={applyCurrentColorToSvg}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                    >
                      Aplicar color de marca
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoSvg(DEFAULT_SVG_PRESET);
                        setSvgFileName('icono-ejemplo.svg');
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Usar ejemplo
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => svgFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleSvgFileSelect(e.dataTransfer.files[0]);
                  }}
                  className="border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/40 rounded-2xl p-4 text-center cursor-pointer transition-all flex items-center justify-between gap-4"
                >
                  <input
                    ref={svgFileInputRef}
                    type="file"
                    accept=".svg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleSvgFileSelect(e.target.files[0]);
                    }}
                  />
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-indigo-950">
                      Haz clic o arrastra tu archivo <code className="bg-white px-1 rounded">.svg</code>
                    </p>
                    <p className="text-[11px] text-indigo-700 mt-0.5 truncate">
                      {svgFileName ? `Cargado: ${svgFileName}` : 'Exportado desde Illustrator, Figma o Canva'}
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shrink-0">
                    Subir .SVG
                  </span>
                </div>

                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer font-semibold text-gray-600 hover:text-black py-1">
                    Ver / editar código fuente SVG manualmente
                  </summary>
                  <textarea
                    rows={4}
                    value={logoSvg}
                    onChange={(e) => setLogoSvg(e.target.value)}
                    placeholder='<svg viewBox="0 0 24 24" fill="currentColor">...</svg>'
                    className="mt-1 block w-full rounded-xl border border-gray-300 p-3 font-mono text-xs shadow-sm focus:border-black focus:ring-black text-gray-700"
                  />
                </details>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Color Principal de Marca</label>
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-black/10"
                    style={{ backgroundColor: logoColor, color: ctaContrastText }}
                  >
                    Contraste auto: {ctaContrastText === '#ffffff' ? 'Texto Blanco' : 'Texto Oscuro'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="color"
                    value={logoColor}
                    onChange={(e) => setLogoColor(e.target.value)}
                    className="h-10 w-12 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={logoColor}
                    onChange={(e) => setLogoColor(e.target.value)}
                    className="w-32 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm uppercase"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setLogoColor(preset.hex)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:scale-105 transition-transform"
                      style={{
                        backgroundColor:
                          logoColor.toLowerCase() === preset.hex.toLowerCase() ? '#f3f4f6' : '#ffffff',
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/10 inline-block"
                        style={{ backgroundColor: preset.hex }}
                      />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Vista Previa Barra & Tokens */}
            <div className="flex flex-col justify-between gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Vista Previa de Marca y Tema ({colorTheme.toUpperCase()})
                </label>
                <div
                  className={`p-6 border border-gray-200 flex flex-col items-center justify-center min-h-[200px] ${previewRadiusClass}`}
                  style={{
                    backgroundColor: colorTheme === 'dark' ? '#111827' : backgroundColor,
                    color: colorTheme === 'dark' ? '#f9fafb' : textColor,
                  }}
                >
                  <div
                    className={`w-full max-w-sm shadow-md border border-black/10 p-4 flex items-center justify-between ${previewRadiusClass}`}
                    style={{
                      backgroundColor: colorTheme === 'dark' ? '#1f2937' : surfaceColor,
                      color: colorTheme === 'dark' ? '#f9fafb' : textColor,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {logoSvg.trim() ? (
                        <div
                          className="w-9 h-9 shrink-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                          style={{ color: logoColor }}
                          dangerouslySetInnerHTML={{ __html: sanitizeClientSvg(logoSvg) }}
                        />
                      ) : (
                        <div
                          className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm"
                          style={{ backgroundColor: logoColor, color: ctaContrastText }}
                        >
                          {siteName.charAt(0) || 'L'}
                        </div>
                      )}
                      <span
                        className="font-extrabold tracking-tight text-lg truncate"
                        style={{ fontFamily: `'${headingFont}', sans-serif` }}
                      >
                        {siteName}
                        <span style={{ color: logoColor }}>.</span>
                      </span>
                    </div>
                    {logoSvg.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoSvg('');
                          setSvgFileName(null);
                        }}
                        className="text-[11px] text-red-500 hover:underline font-semibold shrink-0 ml-2"
                      >
                        Quitar SVG
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Acento Secundario</label>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fondo (Claro)</label>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tarjetas / Surface</label>
                  <input
                    type="color"
                    value={surfaceColor}
                    onChange={(e) => setSurfaceColor(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Texto Base</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tema, Geometría y Botones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Modo de Tema</label>
              <select
                value={colorTheme}
                onChange={(e) => setColorTheme(e.target.value as 'light' | 'dark' | 'auto')}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium"
              >
                <option value="light">Claro (Light)</option>
                <option value="dark">Oscuro (Dark)</option>
                <option value="auto">Automático (Según Sistema)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Redondez de Tarjetas</label>
              <select
                value={cardRadius}
                onChange={(e) => setCardRadius(e.target.value as 'none' | 'soft' | 'rounded' | 'pill')}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium"
              >
                <option value="none">Cuadrado Editorial (0px)</option>
                <option value="soft">Suave (8px)</option>
                <option value="rounded">Moderno (16px)</option>
                <option value="pill">Orgánico / Pill (24px)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Estilo de Botones CTA</label>
              <select
                value={buttonStyle}
                onChange={(e) => setButtonStyle(e.target.value as 'solid' | 'outline')}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium"
              >
                <option value="solid">Sólido (Relleno con contraste automático)</option>
                <option value="outline">Outline (Borde + Relleno al hover)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* TAB 2: TIPOGRAFÍA & HERO */}
      <section className={activeTab === 'hero' ? 'space-y-6' : 'hidden'}>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900">2. Tipografías y Escala</h2>
            <p className="text-sm text-gray-500 mt-1">
              Elige fuentes para títulos y textos, escala visual y pesos cargados de Google Fonts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TYPOGRAPHY_PRESETS.map((preset) => {
              const isSelected = headingFont === preset.heading && bodyFont === preset.body;
              return (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => {
                    setHeadingFont(preset.heading);
                    setBodyFont(preset.body);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-black bg-gray-900 text-white shadow-md'
                      : 'border-gray-200 hover:border-gray-400 bg-gray-50/60 text-gray-900'
                  }`}
                >
                  <div className="text-xs font-extrabold">{preset.title}</div>
                  <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                    {preset.heading} + {preset.body}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tipografía de Títulos</label>
              <select
                value={headingFont}
                onChange={(e) => setHeadingFont(e.target.value)}
                className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tipografía de Cuerpo</label>
              <select
                value={bodyFont}
                onChange={(e) => setBodyFont(e.target.value)}
                className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Escala Tipográfica</label>
              <select
                value={fontScale}
                onChange={(e) => setFontScale(e.target.value as 'compact' | 'normal' | 'editorial')}
                className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold"
              >
                <option value="compact">Compacta (Catálogo denso)</option>
                <option value="normal">Estándar Balanceada</option>
                <option value="editorial">Editorial (Títulos grandes)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pesos Google Fonts</label>
              <input
                type="text"
                value={fontWeights}
                onChange={(e) => setFontWeights(e.target.value)}
                placeholder="400;500;600;700;800"
                className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* BANNER HERO */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900">Banner Principal de Inicio (Hero)</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configura textos, enlace e imagen de portada optimizada en WebP.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Título del Banner</label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Texto del Botón (CTA)</label>
              <input
                type="text"
                value={heroCtaText}
                onChange={(e) => setHeroCtaText(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Subtítulo / Descripción</label>
              <textarea
                rows={2}
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 p-3 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Enlace del Botón (Ruta)</label>
              <input
                type="text"
                value={heroCtaLink}
                onChange={(e) => setHeroCtaLink(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Imagen de Fondo del Banner</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
                className="hidden"
              />
              <p className="text-sm font-semibold text-gray-800">
                {isCompressing
                  ? 'Comprimiendo a WebP y subiendo...'
                  : 'Arrastra aquí tu imagen para el Banner o haz clic para seleccionar'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Compresión automática a WebP en el navegador (1920px máx.)</p>
            </div>
            {stats && (
              <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-block font-mono">
                Comprimido: {stats.original} &rarr; {stats.compressed} ({stats.savings}% ahorro)
              </div>
            )}
            <input
              type="text"
              value={heroImageUrl}
              onChange={(e) => setHeroImageUrl(e.target.value)}
              placeholder="https://..."
              className="mt-3 block w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono"
            />
          </div>

          <div
            className={`relative isolate overflow-hidden bg-gray-900 py-14 sm:py-20 text-center shadow-xl ${previewRadiusClass}`}
            style={{
              backgroundImage: heroImageUrl ? `url('${heroImageUrl}')` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
            <div className="relative z-10 mx-auto max-w-2xl px-6">
              <h1
                className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white"
                style={{ fontFamily: `'${headingFont}', sans-serif` }}
              >
                {heroTitle}
              </h1>
              <p
                className="mt-3 text-sm sm:text-base text-gray-200"
                style={{ fontFamily: `'${bodyFont}', sans-serif` }}
              >
                {heroSubtitle}
              </p>
              <div className="mt-6">
                <span
                  className={`inline-block px-6 py-3 text-sm font-bold ${previewRadiusClass}`}
                  style={
                    buttonStyle === 'outline'
                      ? {
                          border: `2px solid ${logoColor}`,
                          color: '#ffffff',
                          backgroundColor: 'rgba(0,0,0,0.35)',
                          fontFamily: `'${bodyFont}', sans-serif`,
                        }
                      : {
                          backgroundColor: logoColor,
                          color: ctaContrastText,
                          fontFamily: `'${bodyFont}', sans-serif`,
                        }
                  }
                >
                  {heroCtaText} &rarr;
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TAB 3: SECCIONES DE PORTADA */}
      <section className={activeTab === 'home' ? 'space-y-6' : 'hidden'}>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900">3. Textos de Portada y Bloques de Confianza</h2>
            <p className="text-sm text-gray-500 mt-1">
              Edita los encabezados de categorías, productos destacados y tarjetas de beneficios de la página principal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Sección de Categorías (Bento)</h3>
              <input
                type="text"
                value={categoriesBadge}
                onChange={(e) => setCategoriesBadge(e.target.value)}
                placeholder="Etiqueta (ej. Colecciones)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
              <input
                type="text"
                value={categoriesTitle}
                onChange={(e) => setCategoriesTitle(e.target.value)}
                placeholder="Título principal"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
              <textarea
                rows={2}
                value={categoriesSubtitle}
                onChange={(e) => setCategoriesSubtitle(e.target.value)}
                placeholder="Subtítulo"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Sección Productos Destacados</h3>
              <input
                type="text"
                value={featuredBadge}
                onChange={(e) => setFeaturedBadge(e.target.value)}
                placeholder="Etiqueta (ej. Lo más destacado)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
              <input
                type="text"
                value={featuredTitle}
                onChange={(e) => setFeaturedTitle(e.target.value)}
                placeholder="Título principal"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
              <textarea
                rows={2}
                value={featuredSubtitle}
                onChange={(e) => setFeaturedSubtitle(e.target.value)}
                placeholder="Subtítulo"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {[
              { n: 1, title: trust1Title, setTitle: setTrust1Title, desc: trust1Desc, setDesc: setTrust1Desc },
              { n: 2, title: trust2Title, setTitle: setTrust2Title, desc: trust2Desc, setDesc: setTrust2Desc },
              { n: 3, title: trust3Title, setTitle: setTrust3Title, desc: trust3Desc, setDesc: setTrust3Desc },
            ].map((item) => (
              <div key={item.n} className="space-y-2 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs font-bold uppercase text-gray-500">Bloque de Confianza #{item.n}</span>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => item.setTitle(e.target.value)}
                  placeholder="Título corto"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                />
                <textarea
                  rows={3}
                  value={item.desc}
                  onChange={(e) => item.setDesc(e.target.value)}
                  placeholder="Descripción"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs bg-white"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TAB 4: MONEDA, ENVÍO & PICKUP */}
      <section className={activeTab === 'commerce' ? 'space-y-6' : 'hidden'}>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900">4. Moneda, Tarifas de Envío y Retiro en Tienda</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configura la divisa en toda la tienda, el costo de envío y la opción de recoger en tienda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Divisa / País</label>
              <select
                value={currencyCode}
                onChange={(e) => {
                  const selected = CURRENCY_OPTIONS.find((c) => c.code === e.target.value);
                  setCurrencyCode(e.target.value);
                  if (selected) setCurrencyLocale(selected.locale);
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Código ISO (ej. MXN, USD)</label>
              <input
                type="text"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Formato Regional (Locale)</label>
              <input
                type="text"
                value={currencyLocale}
                onChange={(e) => setCurrencyLocale(e.target.value)}
                placeholder="es-MX"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-gray-100 pt-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Costo Fijo de Envío ({currencyCode})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Pon 0.00 si el envío ya está incluido o es gratuito.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Envío Gratis a partir de ({currencyCode})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                placeholder="Ej. 999.00 (deja vacío para desactivar)"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si el subtotal supera este monto, la barra del carrito desbloquea envío gratis automáticamente.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5 space-y-3">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pickupEnabled}
                onChange={(e) => setPickupEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              <span className="text-sm font-semibold text-gray-800">
                Permitir &quot;Recoger en Tienda / Estudio&quot; (sin costo de envío ni dirección de entrega)
              </span>
            </label>
            {pickupEnabled && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Dirección e instrucciones de entrega presencial
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Ej. Estudio Calle Roma #45, Col. Centro (Lunes a Sábado 11am - 6pm)"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TAB 5: ANUNCIOS, CONTACTO & POLÍTICAS */}
      <section className={activeTab === 'contact' ? 'space-y-6' : 'hidden'}>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900">5. Barra de Anuncios, Contacto, Redes y Políticas</h2>
            <p className="text-sm text-gray-500 mt-1">
              Personaliza los datos de contacto, redes sociales, botón de WhatsApp y textos legales del pie de página.
            </p>
          </div>

          {/* Barra superior de anuncios */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={announcementEnabled}
                  onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm font-bold text-gray-900">Activar Barra Superior de Anuncios</span>
              </label>
              {announcementEnabled && announcementText && (
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ backgroundColor: announcementBg, color: announcementContrastText }}
                >
                  Vista previa: {announcementText}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Ej. Envío gratis en compras mayores a $999"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white"
              />
              <input
                type="text"
                value={announcementLink}
                onChange={(e) => setAnnouncementLink(e.target.value)}
                placeholder="/catalogo"
                className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono bg-white"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600 shrink-0">Color Fondo:</label>
                <input
                  type="color"
                  value={announcementBg}
                  onChange={(e) => setAnnouncementBg(e.target.value)}
                  className="h-9 w-12 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={announcementBg}
                  onChange={(e) => setAnnouncementBg(e.target.value)}
                  className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-mono bg-white"
                />
              </div>
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Título Página Contacto</label>
              <input
                type="text"
                value={contactTitle}
                onChange={(e) => setContactTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Subtítulo Contacto</label>
              <input
                type="text"
                value={contactSubtitle}
                onChange={(e) => setContactSubtitle(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Correo de Soporte / Ventas</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono visible</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección Física / Ciudad</label>
              <input
                type="text"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Horario de Atención</label>
              <input
                type="text"
                value={contactHours}
                onChange={(e) => setContactHours(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Redes y WhatsApp */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Instagram URL</label>
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/tucuenta"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">TikTok URL</label>
              <input
                type="url"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://tiktok.com/@tucuenta"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Facebook URL</label>
              <input
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/tupagina"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600"
              />
              <span className="text-sm font-bold text-emerald-950">Mostrar botón flotante de WhatsApp</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Número con lada internacional (ej. 5215512345678)"
                className="rounded-xl border border-emerald-300 px-3 py-2 text-sm bg-white font-mono"
              />
              <input
                type="text"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Mensaje predeterminado al abrir el chat"
                className="rounded-xl border border-emerald-300 px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>

          {/* Políticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Política de Envíos</label>
              <textarea
                rows={4}
                value={shippingPolicyText}
                onChange={(e) => setShippingPolicyText(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Devoluciones y Cambios</label>
              <textarea
                rows={4}
                value={returnsPolicyText}
                onChange={(e) => setReturnsPolicyText(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Aviso de Privacidad</label>
              <textarea
                rows={4}
                value={privacyPolicyText}
                onChange={(e) => setPrivacyPolicyText(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-xs"
              />
            </div>
          </div>
        </div>
      </section>

      {/* TAB 6: SEO & ANALÍTICA */}
      <section className={activeTab === 'seo' ? 'space-y-6' : 'hidden'}>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900">6. Metadatos SEO, Favicons y Analítica</h2>
            <p className="text-sm text-gray-500 mt-1">
              Optimiza cómo se comparte tu tienda en WhatsApp/Google y conecta tus píxeles de medición sin editar código.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Sufijo de Título (&lt;title&gt;)</label>
              <input
                type="text"
                value={seoTitleSuffix}
                onChange={(e) => setSeoTitleSuffix(e.target.value)}
                placeholder="Ej. | Tienda Oficial"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Descripción SEO ({seoDescription.length}/300)
              </label>
              <input
                type="text"
                maxLength={300}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Breve resumen para Google y vistas previas"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">URL Favicon personalizado</label>
              <input
                type="text"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="Vacío = usa automáticamente tu Logo SVG"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Si se deja vacío (o en <code>/favicon.svg</code>), tu Logo SVG guardado se convierte automáticamente en el icono de la pestaña del navegador.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Imagen OpenGraph (Redes)</label>
              <input
                type="text"
                value={ogImageUrl}
                onChange={(e) => setOgImageUrl(e.target.value)}
                placeholder="https://.../og-cover.jpg"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Google Analytics 4 (Measurement ID)</label>
              <input
                type="text"
                value={ga4MeasurementId}
                onChange={(e) => setGa4MeasurementId(e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Meta Pixel ID (Facebook/IG Ads)</label>
              <input
                type="text"
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                placeholder="123456789012345"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-mono"
              />
            </div>
          </div>
        </div>
      </section>

      {/* BOTÓN FLOTANTE DE GUARDAR */}
      <div className="sticky bottom-4 z-20 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl bg-black hover:bg-gray-800 text-white font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando cambios...' : 'Guardar Configuración'}
        </button>
      </div>
    </form>
  );
}
