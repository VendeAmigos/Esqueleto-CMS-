import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, verifyCredentials, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Excluir rutas públicas, APIs internas y recursos estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/uploads') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Obtener y validar cookie de sesión firmada criptográficamente
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;

  // 3. Si visita la página de /login
  if (pathname === '/login') {
    // Si ya está autenticado, redirigir al dashboard
    if (session) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 4. Si tiene sesión válida, permitir el acceso al panel
  if (session) {
    return NextResponse.next();
  }

  // 5. Soporte de respaldo para llamadas automatizadas con Basic Auth
  const basicAuth = req.headers.get('authorization');
  if (basicAuth) {
    try {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');
      if (user && pwd && (await verifyCredentials(user, pwd))) {
        return NextResponse.next();
      }
    } catch {}
  }

  // 6. No autenticado: Redirigir a la pantalla de login segura
  const loginUrl = new URL('/login', req.url);
  if (pathname !== '/') {
    loginUrl.searchParams.set('from', pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
