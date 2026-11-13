/**
 * Utilidades de diseño, contraste accesible (WCAG) y formato de moneda
 * compartidas entre Storefront y Panel de Administración.
 */

export interface CurrencyPreset {
  code: string;
  locale: string;
  label: string;
}

export const CURRENCY_PRESETS: CurrencyPreset[] = [
  { code: 'MXN', locale: 'es-MX', label: 'MXN ($ Peso Mexicano)' },
  { code: 'USD', locale: 'en-US', label: 'USD ($ Dólar Estadounidense)' },
  { code: 'COP', locale: 'es-CO', label: 'COP ($ Peso Colombiano)' },
  { code: 'ARS', locale: 'es-AR', label: 'ARS ($ Peso Argentino)' },
  { code: 'CLP', locale: 'es-CL', label: 'CLP ($ Peso Chileno)' },
  { code: 'PEN', locale: 'es-PE', label: 'PEN (S/ Sol Peruano)' },
  { code: 'EUR', locale: 'es-ES', label: 'EUR (€ Euro)' },
];

export function normalizeHexColor(value: string | null | undefined, fallback = '#ec4899'): string {
  const raw = (value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex: string): number {
  const normalized = normalizeHexColor(hex, '#111827');
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/**
 * Calcula luminancia relativa WCAG 2.x para elegir texto blanco o negro
 * con contraste >= 4.5:1 sobre cualquier color de marca dinámico.
 */
export function getContrastTextColor(hex: string, fallback: '#111827' | '#ffffff' = '#ffffff'): '#111827' | '#ffffff' {
  const normalized = normalizeHexColor(hex, '');
  if (!normalized) return fallback;
  const luminance = getRelativeLuminance(normalized);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithDark = (luminance + 0.05) / 0.0518;
  return contrastWithDark > contrastWithWhite ? '#111827' : '#ffffff';
}

/**
 * Envuelve el SVG de marca en un lienzo cuadrado 64x64 con contraste WCAG para que
 * logotipos altos, anchos o que usan fill="currentColor" se vean nítidos en la pestaña del navegador.
 */
export function buildBrandFaviconSvg(svgMarkup: string, brandColor?: string): string | null {
  const raw = (svgMarkup || '').trim();
  if (!raw) return null;

  const openTagMatch = raw.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i);
  if (!openTagMatch) return null;

  const attrs = openTagMatch[1] || '';
  let inner = openTagMatch[2] || '';

  // Limpieza defensiva mínima si entra SVG desde DB/archivo antiguo
  inner = inner
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  const safeColor = normalizeHexColor(brandColor, '#111827');
  inner = inner.replace(/currentColor/gi, safeColor);

  const viewBoxMatch = attrs.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  let viewBox = viewBoxMatch ? viewBoxMatch[1].trim() : '';
  if (!viewBox) {
    const wMatch = attrs.match(/\bwidth\s*=\s*["']([0-9.]+)(?:px)?["']/i);
    const hMatch = attrs.match(/\bheight\s*=\s*["']([0-9.]+)(?:px)?["']/i);
    const w = wMatch ? parseFloat(wMatch[1]) : 64;
    const h = hMatch ? parseFloat(hMatch[1]) : 64;
    viewBox = `0 0 ${Number.isFinite(w) && w > 0 ? w : 64} ${Number.isFinite(h) && h > 0 ? h : 64}`;
  }

  const lum = getRelativeLuminance(safeColor);
  const contrastOnWhite = 1.05 / (lum + 0.05);
  const badgeFill = contrastOnWhite >= 3 ? '#ffffff' : '#111827';
  const badgeStroke = contrastOnWhite >= 3 ? '#e5e7eb' : '#1f2937';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect x="1" y="1" width="62" height="62" rx="16" fill="${badgeFill}" stroke="${badgeStroke}" stroke-width="1.5"/><svg x="8" y="8" width="48" height="48" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" fill="${safeColor}" color="${safeColor}">${inner}</svg></svg>`;
}

export function buildSvgFaviconDataUri(svgMarkup: string, brandColor?: string): string | null {
  const svg = buildBrandFaviconSvg(svgMarkup, brandColor);
  if (!svg) return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getSvgCacheVersion(svgMarkup?: string | null, color?: string | null): string {
  const seed = `${color || ''}:${(svgMarkup || '').length}:${(svgMarkup || '').slice(0, 120)}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getCurrencyLocale(currencyCode = 'MXN', customLocale?: string): string {
  if (customLocale && customLocale.trim()) return customLocale.trim();
  return CURRENCY_PRESETS.find((c) => c.code === currencyCode)?.locale || 'es-MX';
}

export function formatMoney(
  cents: number,
  currencyCode = 'MXN',
  currencyLocale?: string
): string {
  const safeCode = currencyCode || 'MXN';
  const safeLocale = getCurrencyLocale(safeCode, currencyLocale);
  try {
    return new Intl.NumberFormat(safeLocale, {
      style: 'currency',
      currency: safeCode,
    }).format((cents || 0) / 100);
  } catch {
    return `$${((cents || 0) / 100).toFixed(2)} ${safeCode}`;
  }
}

