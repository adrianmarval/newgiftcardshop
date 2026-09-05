/**
 * Reporta errores client-side (error boundaries, global-error) a app_log
 * via POST /api/log/client-error.
 *
 * FIRE-AND-FORGET: NUNCA lanza — un fallo del reporte no puede tumbar la
 * UI de error que el usuario está viendo (sería un crash sobre el crash).
 */
export function reportClientError(error: Error & { digest?: string }, context: string): void {
  try {
    void fetch('/api/log/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack?.slice(0, 4000),
        digest: error.digest,
        context,
        path: window.location.pathname,
      }),
    }).catch(() => {});
  } catch {
    // noop — el reporte nunca interfiere con el error boundary
  }
}
