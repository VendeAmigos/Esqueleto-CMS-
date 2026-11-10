import type { APIRoute } from 'astro';

/**
 * Proxy de consulta de Código Postal (SEPOMEX vía COPOMEX).
 * Mantiene el token COPOMEX_TOKEN en el servidor y cachea en memoria las respuestas.
 *
 * GET /api/postal-code/64000 ->
 *   { cp, estado, municipio, ciudad, colonias: string[] }
 */

interface PostalCodeInfo {
  cp: string;
  estado: string;
  municipio: string;
  ciudad: string;
  colonias: string[];
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 h
const cache = new Map<string, { data: PostalCodeInfo; expires: number }>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(status === 200 ? { 'Cache-Control': 'public, max-age=86400' } : {}),
    },
  });

export const GET: APIRoute = async ({ params }) => {
  const cp = (params.cp || '').trim();

  if (!/^\d{5}$/.test(cp)) {
    return json({ error: 'El código postal debe tener 5 dígitos' }, 400);
  }

  const token = process.env.COPOMEX_TOKEN?.trim();
  if (!token) {
    return json({ error: 'Búsqueda por código postal no configurada (falta COPOMEX_TOKEN)' }, 503);
  }

  const cached = cache.get(cp);
  if (cached && cached.expires > Date.now()) {
    return json(cached.data);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `https://api.copomex.com/query/info_cp/${cp}?type=simplified&token=${encodeURIComponent(token)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    const payload: any = await res.json().catch(() => null);

    if (!res.ok || !payload || payload.error) {
      const msg = payload?.error_message || 'Código postal no encontrado';
      return json({ error: msg }, res.status === 200 ? 404 : res.status);
    }

    const r = payload.response || {};
    const colonias: string[] = Array.isArray(r.asentamiento)
      ? r.asentamiento
      : r.asentamiento
        ? [r.asentamiento]
        : [];

    const data: PostalCodeInfo = {
      cp: r.cp || cp,
      estado: r.estado || '',
      municipio: r.municipio || '',
      ciudad: r.ciudad || r.municipio || '',
      colonias: Array.from(new Set(colonias)).sort((a, b) => a.localeCompare(b, 'es')),
    };

    cache.set(cp, { data, expires: Date.now() + CACHE_TTL_MS });
    return json(data);
  } catch (err: any) {
    console.error('Error consultando COPOMEX:', err?.message || err);
    return json({ error: 'No se pudo consultar el código postal. Escribe los datos manualmente.' }, 502);
  }
};
