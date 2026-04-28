export type Locale = 'es-AR' | 'en-US';

export function formatDateTime(date: Date | string, locale?: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const userLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'es-AR');
  const useES = userLocale.startsWith('es');

  const weekday = d.toLocaleDateString(userLocale, { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString(userLocale, { month: 'short' });
  const hour = d.toLocaleTimeString(userLocale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: !useES,
  });

  return `${weekday} ${day} ${month}: ${hour}`;
}
