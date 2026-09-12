import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks de módulos ─────────────────────────────────────────────────────────

const mockIssueFindUnique = vi.fn();
const mockIssueUpdate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    giftcardIssue: {
      findUnique: (...args: unknown[]) => mockIssueFindUnique(...args),
      update: (...args: unknown[]) => mockIssueUpdate(...args),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), action: vi.fn() },
}));

import { attachIssueProof } from './order-issue';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PROOF = new Uint8Array(new TextEncoder().encode('fake-encrypted-image'));
const BASE_PARAMS = { issueId: 'issue-1', userId: 'buyer-1', proofData: PROOF, proofMimeType: 'image/jpeg' };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('attachIssueProof', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adjunta la evidencia cuando el issue pertenece al buyer', async () => {
    mockIssueFindUnique.mockResolvedValue({ id: 'issue-1', reportedById: 'buyer-1' });

    await attachIssueProof(BASE_PARAMS);

    expect(mockIssueUpdate).toHaveBeenCalledWith({
      where: { id: 'issue-1' },
      data: { proofData: PROOF, proofMimeType: 'image/jpeg' },
    });
  });

  it('permite re-adjuntar (reemplaza la evidencia previa)', async () => {
    mockIssueFindUnique.mockResolvedValue({ id: 'issue-1', reportedById: 'buyer-1' });

    const newProof = new Uint8Array(new TextEncoder().encode('new-image'));
    await attachIssueProof({ ...BASE_PARAMS, proofData: newProof });

    expect(mockIssueUpdate).toHaveBeenCalledWith({
      where: { id: 'issue-1' },
      data: { proofData: newProof, proofMimeType: 'image/jpeg' },
    });
  });

  it('rechaza si el issue no existe', async () => {
    mockIssueFindUnique.mockResolvedValue(null);

    await expect(attachIssueProof(BASE_PARAMS)).rejects.toThrow('Reporte no encontrado');
    expect(mockIssueUpdate).not.toHaveBeenCalled();
  });

  it('rechaza si el issue fue reportado por otro usuario', async () => {
    mockIssueFindUnique.mockResolvedValue({ id: 'issue-1', reportedById: 'otro-buyer' });

    await expect(attachIssueProof(BASE_PARAMS)).rejects.toThrow('No autorizado');
    expect(mockIssueUpdate).not.toHaveBeenCalled();
  });
});
