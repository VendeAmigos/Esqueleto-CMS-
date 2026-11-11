import { NextResponse } from 'next/server';
import { isDatabaseAvailable } from '@esqueleto/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbOnline = await isDatabaseAvailable();
  return NextResponse.json(
    {
      status: 'ok',
      service: 'esqueleto-admin',
      database: dbOnline ? 'online' : 'local_fallback',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

