import type { APIRoute } from 'astro';
import { getStoredSiteSettings, buildBrandFaviconSvg } from '@esqueleto/core';

const FALLBACK_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect x="1" y="1" width="62" height="62" rx="16" fill="#111827"/><path d="M22 26a10 10 0 0 1 20 0v2h4l2 22H16l2-22h4v-2Zm4 2h12v-2a6 6 0 1 0-12 0v2Z" fill="#ffffff"/></svg>`;

export const GET: APIRoute = async () => {
  try {
    const settings = await getStoredSiteSettings();
    const generated = buildBrandFaviconSvg(settings.logoSvg || '', settings.logoColor);
    const svg = generated || FALLBACK_FAVICON_SVG;

    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch {
    return new Response(FALLBACK_FAVICON_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
};

