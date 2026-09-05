'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/utils';

/**
 * Error boundary del ROOT layout. Next reemplaza el layout entero, así que
 * este componente DEBE renderizar su propio <html>/<body> y NO puede usar
 * Tailwind (globals.css vive en el layout que acaba de crashear) — por eso
 * los estilos son inline.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error);
    reportClientError(error, 'global-error');
  }, [error]);

  return (
    <html lang="en" translate="no">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#0a0a0a',
          color: '#fafafa',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Something went wrong</h2>
        <p style={{ color: '#a1a1aa', maxWidth: '28rem', textAlign: 'center', margin: 0 }}>{error.message}</p>
        <button
          onClick={reset}
          style={{
            marginTop: '8px',
            borderRadius: '8px',
            border: 'none',
            padding: '10px 24px',
            fontWeight: 500,
            cursor: 'pointer',
            backgroundColor: '#fafafa',
            color: '#0a0a0a',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
