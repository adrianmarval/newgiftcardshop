// ─────────────────────────────────────────────────────────────────────────────
// Application — Shared App Section type
// Identifies the major section/route of the application.
// Used for navigation, redirects, and conditional UI based on current section.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The three main sections of the application.
 *
 * - admin: Administrative dashboard (platform management, user management)
 * - buy: Buyer dashboard (purchase gift cards, view orders)
 * - sell: Seller dashboard (sell gift cards, manage inventory, view payouts)
 *
 * @example
 * // In auth forms to determine redirect path after login:
 * function LoginForm({ portal }: LoginFormProps) {
 *   const redirectTo = portal === 'sell' ? '/sell/dashboard' : '/buy/dashboard';
 * }
 *
 * @example
 * // In navigation to highlight active section:
 * const isActive = currentSection === 'buy';
 */
export type AppSection = 'admin' | 'buy' | 'sell';

/**
 * Human-readable labels for each app section.
 * Use for displaying section names in UI (tabs, breadcrumbs, page titles).
 */
export const APP_SECTION_LABELS: Record<AppSection, string> = {
  admin: 'Portal Admin',
  buy: 'Portal Comprador',
  sell: 'Portal Vendedor',
};

/**
 * Root paths for each app section.
 * Use for constructing redirect URLs and navigation links.
 */
export const APP_SECTION_PATHS: Record<AppSection, string> = {
  admin: '/admin',
  buy: '/buy',
  sell: '/sell',
};
