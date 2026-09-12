// ─────────────────────────────────────────────────────────────────────────────
// Tests de regresión del incidente sept 2026: la action register aceptaba
// portal 'admin', permitiendo crear cuentas ADMIN por el flujo "legítimo".
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { registerInputSchema } from './schemas';

const validBase = {
  fullName: 'Test User',
  email: 'test@example.com',
  password: 'Secret123!',
  confirmPassword: 'Secret123!',
};

describe('registerInputSchema', () => {
  it('acepta portal sell', () => {
    const result = registerInputSchema.safeParse({ ...validBase, portal: 'sell' });
    expect(result.success).toBe(true);
  });

  it('acepta portal buy', () => {
    const result = registerInputSchema.safeParse({ ...validBase, portal: 'buy' });
    expect(result.success).toBe(true);
  });

  it('RECHAZA portal admin (no existe registro self-service de admin)', () => {
    const result = registerInputSchema.safeParse({ ...validBase, portal: 'admin' });
    expect(result.success).toBe(false);
  });
});
