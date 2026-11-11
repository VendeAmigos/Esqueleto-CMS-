import type { APIRoute } from 'astro';
import { isDatabaseAvailable } from '@esqueleto/core';

export const GET: APIRoute = async () => {
  const dbOnline = await isDatabaseAvailable();
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'esqueleto-storefront',
      database: dbOnline ? 'online' : 'local_fallback',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

