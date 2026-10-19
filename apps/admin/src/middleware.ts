import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    try {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');

      const expectedUser = process.env.ADMIN_USER || 'admin';
      const expectedPwd = process.env.ADMIN_PASSWORD || 'esqueleto';

      if (user === expectedUser && pwd === expectedPwd) {
        return NextResponse.next();
      }
    } catch {
      // Formato inválido de autorización
    }
  }

  return new NextResponse('Autenticación requerida para acceder al Panel de Administración', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Panel de Administracion"',
    },
  });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
