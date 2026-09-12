// ─────────────────────────────────────────────────────────────────────────────
// Tests de regresión del incidente sept 2026: probing automatizado creó cuentas
// ADMIN activas vía POST directo a /api/auth/sign-up/email porque role/isActive
// eran additionalFields con input:true (el default). Si alguien revierte esto,
// estos tests fallan.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { auth } from './auth-server';

describe('auth config — campos privilegiados NO aceptan input del cliente', () => {
  it('role tiene input:false (nadie puede auto-asignarse ADMIN vía sign-up)', () => {
    expect(auth.options.user?.additionalFields?.role?.input).toBe(false);
  });

  it('isActive tiene input:false (nadie puede auto-activarse vía sign-up)', () => {
    expect(auth.options.user?.additionalFields?.isActive?.input).toBe(false);
  });

  it('role mantiene default BUYER para los flujos legítimos', () => {
    expect(auth.options.user?.additionalFields?.role?.defaultValue).toBe('BUYER');
  });

  it('existe el tripwire databaseHook user.create.after (alerta de nuevo ADMIN)', () => {
    expect(auth.options.databaseHooks?.user?.create?.after).toBeTypeOf('function');
  });
});

describe('auth config — rate limiting (defensa en profundidad post-incidente)', () => {
  it('rate limiting habilitado siempre (no solo en producción)', () => {
    expect(auth.options.rateLimit?.enabled).toBe(true);
  });

  it('sign-up limitado a 5/hora por IP (frena creación scripteada de cuentas)', () => {
    expect(auth.options.rateLimit?.customRules?.['/sign-up/email']).toEqual({ window: 3600, max: 5 });
  });

  it('sign-in limitado a 10/min por IP (frena credential stuffing)', () => {
    expect(auth.options.rateLimit?.customRules?.['/sign-in/email']).toEqual({ window: 60, max: 10 });
  });

  it('detección de IP prioriza cf-connecting-ip (Cloudflare tunnel en prod)', () => {
    expect(auth.options.advanced?.ipAddress?.ipAddressHeaders).toEqual(['cf-connecting-ip', 'x-forwarded-for']);
  });
});
