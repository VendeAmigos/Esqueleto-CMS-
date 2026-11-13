'use server';

import {
  saveStoredSiteSettings,
  normalizeHexColor,
  getCurrencyLocale,
  type ColorThemeMode,
  type CardRadiusPreset,
  type ButtonStylePreset,
  type FontScalePreset,
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

function sanitizeSvgMarkup(rawSvg: string): string {
  if (!rawSvg) return '';
  return rawSvg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<script[\s\S]*?\/>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<(iframe|object|embed|applet|meta|link|base)[\s\S]*?>([\s\S]*?<\/\1>)?/gi, '')
    .replace(/<(set|animate|animateTransform|animateMotion)[^>]*attributeName\s*=\s*["']?\s*(href|xlink:href|on\w+)[\s\S]*?>([\s\S]*?<\/\1>)?/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:href|xlink:href|src|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, '')
    .trim();
}

function sanitizeSafeLink(raw: string | undefined, fallback = ''): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.toString();
  } catch {
    // link inválido
  }
  return fallback;
}

function sanitizeImageSrc(raw: string | undefined): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  if (/^data:image\/(webp|png|jpeg|jpg|svg\+xml);base64,/i.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.toString();
  } catch {
    // URL inválida
  }
  return null;
}

function parseCheckbox(formData: FormData, key: string): boolean {
  const val = formData.get(key)?.toString();
  return val === 'true' || val === 'on' || val === '1';
}

function parseMoneyUnitsToCents(raw: string | undefined): number {
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100);
}

export async function updateSiteSettings(formData: FormData) {
  try {
    await ensureAdminAuthenticated();

    const str = (key: string, fallback = '') => formData.get(key)?.toString()?.trim() ?? fallback;

    const siteName = str('siteName') || 'LUNA ART STUDIO';
    const rawSvg = formData.get('logoSvg')?.toString() || '';
    const logoSvg = sanitizeSvgMarkup(rawSvg);
    const logoColor = normalizeHexColor(str('logoColor'), '#ec4899');
    const headingFont = str('headingFont') || 'Plus Jakarta Sans';
    const bodyFont = str('bodyFont') || 'Inter';

    const heroTitle = str('heroTitle') || 'Ilustración de Autor, Prints & Merch Exclusivo';
    const heroSubtitle = str('heroSubtitle');
    const heroImageUrl = sanitizeImageSrc(formData.get('heroImageUrl')?.toString()) || '';
    const heroCtaText = str('heroCtaText') || 'Explorar Catálogo';
    const heroCtaLink = sanitizeSafeLink(str('heroCtaLink'), '/catalogo');

    const accentColor = normalizeHexColor(str('accentColor'), '#6366f1');
    const backgroundColor = normalizeHexColor(str('backgroundColor'), '#f9fafb');
    const surfaceColor = normalizeHexColor(str('surfaceColor'), '#ffffff');
    const textColor = normalizeHexColor(str('textColor'), '#111827');

    const rawTheme = str('colorTheme');
    const colorTheme: ColorThemeMode =
      rawTheme === 'dark' || rawTheme === 'auto' ? rawTheme : 'light';

    const rawRadius = str('cardRadius');
    const cardRadius: CardRadiusPreset =
      rawRadius === 'none' || rawRadius === 'soft' || rawRadius === 'pill'
        ? rawRadius
        : 'rounded';

    const rawBtnStyle = str('buttonStyle');
    const buttonStyle: ButtonStylePreset = rawBtnStyle === 'outline' ? 'outline' : 'solid';

    const rawScale = str('fontScale');
    const fontScale: FontScalePreset =
      rawScale === 'compact' || rawScale === 'editorial' ? rawScale : 'normal';

    const fontWeights = str('fontWeights') || '400;500;600;700;800';

    const announcementEnabled = parseCheckbox(formData, 'announcementEnabled');
    const announcementText = str('announcementText');
    const announcementLink = sanitizeSafeLink(str('announcementLink'), '/catalogo');
    const announcementBg = normalizeHexColor(str('announcementBg'), '#111827');

    const contactTitle = str('contactTitle') || 'Contáctanos';
    const contactSubtitle = str('contactSubtitle');
    const contactEmail = str('contactEmail');
    const contactPhone = str('contactPhone');
    const contactAddress = str('contactAddress');
    const contactHours = str('contactHours');
    const instagramUrl = sanitizeSafeLink(str('instagramUrl'));
    const tiktokUrl = sanitizeSafeLink(str('tiktokUrl'));
    const facebookUrl = sanitizeSafeLink(str('facebookUrl'));
    const whatsappEnabled = parseCheckbox(formData, 'whatsappEnabled');
    const whatsappNumber = str('whatsappNumber').replace(/[^\d+]/g, '');
    const whatsappMessage = str('whatsappMessage');

    const shippingPolicyText = str('shippingPolicyText');
    const returnsPolicyText = str('returnsPolicyText');
    const privacyPolicyText = str('privacyPolicyText');

    const categoriesBadge = str('categoriesBadge');
    const categoriesTitle = str('categoriesTitle');
    const categoriesSubtitle = str('categoriesSubtitle');
    const featuredBadge = str('featuredBadge');
    const featuredTitle = str('featuredTitle');
    const featuredSubtitle = str('featuredSubtitle');
    const trust1Title = str('trust1Title');
    const trust1Desc = str('trust1Desc');
    const trust2Title = str('trust2Title');
    const trust2Desc = str('trust2Desc');
    const trust3Title = str('trust3Title');
    const trust3Desc = str('trust3Desc');

    const currencyCode = (str('currencyCode') || 'MXN').toUpperCase().slice(0, 5);
    const currencyLocale = getCurrencyLocale(currencyCode, str('currencyLocale'));
    const shippingFeeCents = parseMoneyUnitsToCents(formData.get('shippingFee')?.toString());
    const rawFreeThreshold = str('freeShippingThreshold');
    const freeShippingThresholdCents =
      rawFreeThreshold !== '' && Number.isFinite(Number(rawFreeThreshold)) && Number(rawFreeThreshold) >= 0
        ? Math.round(Number(rawFreeThreshold) * 100)
        : null;
    const pickupEnabled = parseCheckbox(formData, 'pickupEnabled');
    const pickupAddress = str('pickupAddress');

    const faviconUrl = sanitizeImageSrc(formData.get('faviconUrl')?.toString()) || '';
    const ogImageUrl = sanitizeImageSrc(formData.get('ogImageUrl')?.toString()) || '';
    const seoDescription = str('seoDescription').slice(0, 300);
    const seoTitleSuffix = str('seoTitleSuffix').slice(0, 80);
    const ga4MeasurementId = str('ga4MeasurementId').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
    const metaPixelId = str('metaPixelId').replace(/[^\d]/g, '').slice(0, 30);

    await saveStoredSiteSettings({
      siteName,
      logoSvg,
      logoColor,
      headingFont,
      bodyFont,
      heroTitle,
      heroSubtitle,
      heroImageUrl,
      heroCtaText,
      heroCtaLink,
      accentColor,
      backgroundColor,
      surfaceColor,
      textColor,
      colorTheme,
      cardRadius,
      buttonStyle,
      fontScale,
      fontWeights,
      announcementEnabled,
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
      whatsappEnabled,
      whatsappNumber,
      whatsappMessage,
      shippingPolicyText,
      returnsPolicyText,
      privacyPolicyText,
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
      shippingFeeCents,
      freeShippingThresholdCents,
      pickupEnabled,
      pickupAddress,
      faviconUrl,
      ogImageUrl,
      seoDescription,
      seoTitleSuffix,
      ga4MeasurementId,
      metaPixelId,
    });

    revalidatePath('/apariencia');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error actualizando apariencia:', error);
    return { success: false, error: error.message };
  }
}
