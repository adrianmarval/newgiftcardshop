/**
 * Mapea la ruta actual al scope de Service Worker del portal.
 *
 * INVARIANTE (atribución de notificaciones en Android): Chrome atribuye una
 * notificación push a la PWA instalada (ícono y nombre de la app en vez de
 * Chrome) SOLO si el scope del SW que la recibe matchea el intent-filter del
 * WebAPK, que se genera del `scope` del manifest (WebApkValidator.
 * queryFirstWebApkPackage). Un SW en scope `/` NO matchea WebAPKs con scope
 * `/sell|/store|/admin` → la notificación la postea Chrome.
 *
 * Por eso el SW de push se registra con el scope del portal actual, idéntico
 * al `scope` de cada manifest (con trailing slash).
 */
export function getPortalSwScope(pathname: string): string {
  if (pathname.startsWith('/store')) return '/store/';
  if (pathname.startsWith('/admin')) return '/admin/';
  // /sell/* y la landing (sell-facing)
  return '/sell/';
}
