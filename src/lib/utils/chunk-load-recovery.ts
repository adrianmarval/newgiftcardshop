/**
 * Recuperación de ChunkLoadError — el síntoma de "deploy con pestañas abiertas".
 *
 * Webpack hashea los chunks por build (`5400-<hash>.js`). Un cliente con el
 * build VIEJO en memoria que navega post-deploy pide un chunk que ya no existe
 * en el servidor → 404 → `ChunkLoadError` → crash del árbol de React → error
 * boundary. Reintentar con `reset()` NO sirve (webpack cachea el fallo y el
 * chunk sigue sin existir) — la única cura es un full reload, que trae el HTML
 * con los hashes del build nuevo.
 *
 * Guard anti-loop: un solo reload por ventana de 10s (sessionStorage). Si el
 * reload también falla (servidor caído, red), el usuario ve la UI de error
 * normal en vez de un loop infinito de recargas.
 */

const RELOAD_GUARD_KEY = 'chunk-error-reload-at';
const RELOAD_GUARD_WINDOW_MS = 10_000;

/** Detecta el error de chunk stale de webpack (por name o por mensaje). */
export function isChunkLoadError(error: Error): boolean {
  return error.name === 'ChunkLoadError' || /^Loading chunk \S+ failed/.test(error.message);
}

/**
 * Fuerza un full reload ONE-SHOT para recuperarse de un ChunkLoadError.
 * Retorna true si el reload se disparó (el boundary no debería seguir
 * reportando/renderizando), false si el guard anti-loop lo bloqueó.
 */
export function reloadForChunkError(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_GUARD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage inaccesible (modo privado extremo) — sin guard no hay
    // forma de prevenir un loop de recargas, preferimos mostrar la UI de error.
    return false;
  }
  window.location.reload();
  return true;
}
