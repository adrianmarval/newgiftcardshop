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
