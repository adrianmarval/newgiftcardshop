import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// Proxy (ex-middleware, convención Next 16)
//
// Dos responsabilidades:
// 1. Inyectar `x-current-path` para que `unauthorized.tsx` arme el login correcto.
// 2. Check OPTIMISTA de sesión: solo presencia de la cookie de better-auth
//    (`__Secure-` prefix en prod/https, sin prefijo en dev/http). Sin cookie →
//    redirect directo al login del portal, sin renderizar el árbol del dashboard.
//
// NUNCA validar la sesión acá (sin DB en proxy — corre en cada request).
// La autorización REAL vive server-side: layouts (authorizeByRequiredRole) y
// server actions (buyer/seller/adminActionClient). Esto es solo UX/perf.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_COOKIE_NAMES = ['__Secure-better-auth.session_token', 'better-auth.session_token'];

/** Primer segmento de la URL → login del portal. */
const PORTAL_LOGIN: Record<string, string> = {
  sell: '/sell/auth/login',
  store: '/buy/auth/login',
  admin: '/admin/auth/login',
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
  if (!hasSessionCookie) {
    const segment = pathname.split('/')[1];
    const loginUrl = PORTAL_LOGIN[segment] ?? '/'; // /pending-activation → landing
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-current-path', pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/store/dashboard/:path*', '/sell/dashboard/:path*', '/admin/dashboard/:path*', '/pending-activation'],
};
