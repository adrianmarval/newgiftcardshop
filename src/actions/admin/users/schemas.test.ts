// ─────────────────────────────────────────────────────────────────────────────
// Tests de regresión del incidente sept 2026: updateUser permitía promover
// cualquier usuario a ADMIN por API. El schema ya no acepta el valor.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { updateUserInputSchema } from './schemas';

describe('updateUserInputSchema', () => {
  it('RECHAZA role ADMIN (invariante de admin único)', () => {
    const result = updateUserInputSchema.safeParse({ userId: 'abc', role: 'ADMIN' });
    expect(result.success).toBe(false);
  });

  it('acepta BUYER y SELLER (gestión legítima de roles)', () => {
    expect(updateUserInputSchema.safeParse({ userId: 'abc', role: 'BUYER' }).success).toBe(true);
    expect(updateUserInputSchema.safeParse({ userId: 'abc', role: 'SELLER' }).success).toBe(true);
  });

  it('acepta updates sin role (isActive, creditLimit, etc.)', () => {
    const result = updateUserInputSchema.safeParse({ userId: 'abc', isActive: true, creditLimit: 500 });
    expect(result.success).toBe(true);
  });
});
