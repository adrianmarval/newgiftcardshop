// ─────────────────────────────────────────────────────────────────────────────
// Portal Config — AppSection, role/dashboard maps, and per-portal auth config
// Runtime config used by both server and client.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import type { Role } from '@/generated/prisma/enums';

// ── App Section ───────────────────────────────────────────────────────────────

/** Internal portal id used by forms and components. */
export type AppSection = 'admin' | 'buy' | 'sell';

export const portalSchema = z.enum(['sell', 'buy', 'admin']);

/** Type guard for runtime values (URL segments, form props, etc.). */
export function isAppSection(value: string): value is AppSection {
  return value === 'admin' || value === 'buy' || value === 'sell';
}

export const roleMap: Record<AppSection, Role> = {
  admin: 'ADMIN',
  buy: 'BUYER',
  sell: 'SELLER',
};

export const dashboardMap: Record<AppSection, string> = {
  admin: '/admin/dashboard',
  buy: '/store/dashboard',
  sell: '/sell/dashboard',
};

export const APP_SECTION_LABELS: Record<AppSection, string> = {
  admin: 'Portal Admin',
  buy: 'Portal Comprador',
  sell: 'Portal Vendedor',
};

/** URL base segment per portal (e.g. '/admin', '/store', '/sell'). */
export const appSectionMap: Record<AppSection, string> = {
  admin: '/admin',
  buy: '/store',
  sell: '/sell',
};

// ── Auth Portal Config ───────────────────────────────────────────────────────

/** Per-portal auth UI configuration. Keyed by AppSection. */
export interface PortalAuthConfig {
  /** Theme for the AuthLayout. */
  theme: {
    bgColor: string;
    gradientFrom: string;
    gradientVia: string;
    blobBg: string;
    accentText: string;
    title: string;
    subtitle: string;
  };
  login: {
    title: string;
    subtitle: string;
    emailPlaceholder?: string;
    registerPrompt?: string;
    registerLinkText?: string;
  };
  register?: {
    title: string;
    subtitle: string;
  };
  verify2faTitle: string;
  forgotPasswordTitle: string;
  resetPasswordTitle: string;
  hasRegister: boolean;
}

export const PORTAL_AUTH_CONFIG: Record<AppSection, PortalAuthConfig> = {
  admin: {
    theme: {
      bgColor: 'bg-[#120a1f]',
      gradientFrom: 'from-violet-900/20',
      gradientVia: 'via-[#120a1f]',
      blobBg: 'bg-violet-500/5',
      accentText: 'text-violet-400',
      title: 'Admin',
      subtitle: 'Portal de Administración',
    },
    login: {
      title: 'Portal de Admin',
      subtitle: 'Acceso restringido — solo administradores',
      emailPlaceholder: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'admin@example.com',
    },
    verify2faTitle: 'Verificar 2FA Admin',
    forgotPasswordTitle: 'Olvidé mi Contraseña',
    resetPasswordTitle: 'Restablecer Contraseña',
    hasRegister: false,
  },
  buy: {
    theme: {
      bgColor: 'bg-[#0a1525]',
      gradientFrom: 'from-blue-900/20',
      gradientVia: 'via-[#0a1525]',
      blobBg: 'bg-blue-500/5',
      accentText: 'text-blue-400',
      title: 'Buy',
      subtitle: 'Mercado de Tarjetas de Regalo',
    },
    login: {
      title: 'Inicio de Sesión Comprador',
      subtitle: 'Accede a tu cuenta para explorar y comprar tarjetas de regalo',
      registerPrompt: '¿No tienes una cuenta?',
      registerLinkText: 'Regístrate',
    },
    register: {
      title: 'Crear Cuenta',
      subtitle: 'Regístrate para empezar a comprar tarjetas de regalo a excelentes precios',
    },
    verify2faTitle: 'Verificar 2FA',
    forgotPasswordTitle: 'Olvidé mi Contraseña',
    resetPasswordTitle: 'Restablecer Contraseña',
    hasRegister: true,
  },
  sell: {
    theme: {
      bgColor: 'bg-[#0a1a1a]',
      gradientFrom: 'from-emerald-900/20',
      gradientVia: 'via-slate-950',
      blobBg: 'bg-emerald-500/5',
      accentText: 'text-emerald-400',
      title: 'Sell',
      subtitle: 'Gift Card Seller Portal',
    },
    login: {
      title: 'Seller Sign In',
      subtitle: 'Access your seller dashboard to manage gift cards',
      registerPrompt: "Don't have a seller account?",
      registerLinkText: 'Create one',
    },
    register: {
      title: 'Become a Seller',
      subtitle: 'Create your seller account to start listing gift cards',
    },
    verify2faTitle: 'Verify 2FA',
    forgotPasswordTitle: 'Forgot Password',
    resetPasswordTitle: 'Reset Password',
    hasRegister: true,
  },
};