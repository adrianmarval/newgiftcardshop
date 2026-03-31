# Design: Sell Flow & Dynamic Economic Model

## Technical Approach

Extend the existing seller dashboard with three orthogonal concerns applied atomically: (1) AES-256-GCM encryption of claim codes at the persistence boundary (server actions only), (2) schema additions that snapshot rates at creation time instead of computing them live, and (3) wiring the real `publishBatch` action into the stub wizard. All three concerns share a single Prisma migration to avoid partial breakage during deployment.

## Architecture Decisions

| Decision | Choice | Alternatives Rejected | Rationale |
|---|---|---|---|
| Encryption boundary | Server actions only (`src/lib/encryption.ts`) | Edge middleware, DB trigger | Keeps client ignorant of crypto; single audit point; consistent with existing pattern in `giftcard-actions.ts` |
| Duplicate detection | SHA-256 `codeHash` via `crypto` (Node built-in) | DB-level unique on encrypted value, application set | Deterministic — same plaintext always yields same hash; `@unique` constraint at DB gives race-condition safety for free |
| Encryption format | `base64(iv:ciphertext:authTag)` joined with `:` | Separate columns per part | Single string column fits existing `claimCode String` schema; self-contained for decryption |
| Encryption key | `ENCRYPTION_KEY` env var (32-byte hex) → `Buffer.from(key, 'hex')` | KMS, per-row key | Simplest viable option for a single-tenant app; loss risk documented |
| Rate snapshot | `sellRate` on `GiftcardBatch`, `buyRate` on `Order` at insert time | Always read from `User` | Prevents rate changes by admin from retroactively altering financial records |
| `price` removal strategy | Remove from schema + all callsites atomically | Deprecate then remove | Only a dev environment with seed data exists; safe to cut in one migration |
| `publishBatch` return | `{ success, batchId?, duplicates?, error? }` | Throw on failure | Matches pattern of all other actions (`createOrder`, `completeOrder`); client can surface duplicate list |
| Payout calculation location | `getSellerBatches` server action (compute on server) | Client-side after fetch | Keeps financial logic server-side; seller-cards-view becomes pure display |

## Data Flow

### publishBatch (seller submits wizard)

```
SellBatchManager (client)
  │  calls publishBatch({ cards, brandId, countryId })
  ▼
publishBatch (server action)
  ├─ getSession() → userId
  ├─ prisma.user.findUnique → sellRate (snapshot)
  ├─ hashCode(claimCode) for each card
  ├─ prisma.giftcard.findMany({ codeHash: { in: hashes } }) → duplicates
  ├─ filter duplicates out of cards list
  ├─ encrypt(claimCode), encrypt(pinCode) for remaining cards
  └─ prisma.$transaction
       ├─ giftcardBatch.create({ sellRate, isPaid: false })
       └─ giftcard.createMany({ codeHash, claimCode: encrypted, ... })
  └─ return { success, batchId, duplicates? }
```

### getSellerBatches (my cards view loads)

```
SellerCardsView (RSC, calls server action)
  ▼
getSellerBatches (server action)
  ├─ prisma.giftcardBatch.findMany({ include: giftcards, payments })
  ├─ for each card: decrypt(claimCode), decrypt(pinCode)
  ├─ convert Decimal → number (amount, sellRate)
  └─ return Batch[] with sellRate, isPaid
```

### getOrderCards (buyer reveals codes after purchase)

```
getOrderCards (server action)
  ├─ verify order ownership
  ├─ for each card: decrypt(claimCode), decrypt(pinCode)
  └─ return BuyGiftcardItem[] (codes now plaintext for buyer)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Modify | Remove `Giftcard.price`; add `Giftcard.codeHash String @unique`; add `GiftcardBatch.sellRate Decimal? @db.Decimal(10,4)` + `isPaid Boolean @default(false)`; add `Order.buyRate Decimal? @db.Decimal(10,4)`; remove `@unique` from `Giftcard.claimCode` (encrypted values are not deterministic; uniqueness enforced via `codeHash`) |
| `src/lib/encryption.ts` | Create | `encrypt(plaintext): string`, `decrypt(ciphertext): string`, `hashCode(plaintext): string` using Node `crypto` |
| `src/actions/seller-actions.ts` | Modify | Add `publishBatch`; rewrite `getSellerBatches` to decrypt codes + expose `sellRate`/`isPaid` |
| `src/actions/order-actions.ts` | Modify | `createOrder`: snapshot `buyRate` on `Order.create`; `getBuyerOrders`: remove `price` from map; `confirmOrderUsage`: fetch stored `buyRate` from order instead of re-reading user |
| `src/actions/giftcard-actions.ts` | Modify | `getOrderCards`: decrypt `claimCode`/`pinCode`; `searchGiftcards`: remove `price` field from map |
| `src/types/domain.ts` | Modify | Remove `price?` from `Giftcard`; add `sellRate: number` + `isPaid: boolean` to `Batch` |
| `src/types/flows.ts` | Modify | Remove `price: number` from `BuyGiftcardItem`; add `sellRate?: number` |
| `src/components/sell/sell-batch-manager.tsx` | Modify | Accept `sellRate: number` prop; replace `handlePublish` stub with real `publishBatch` call; surface duplicate feedback |
| `src/components/sell/steps/review-step.tsx` | Modify | Accept `sellRate: number` prop; replace hardcoded `0.85` |
| `src/components/sell/seller-cards-view.tsx` | Modify | Update local `Batch` interface to include `sellRate`/`isPaid`; update payout calc using `effectiveAmount × sellRate`; show `isPaid` badge |
| `src/app/(dashboard)/sell/dashboard/sell-cards/page.tsx` | Modify | Fetch `user.sellRate` and pass to `SellBatchManager` |
| `prisma/migrations/` | Create | Auto-generated migration from `prisma migrate dev` |

## Interfaces / Contracts

```typescript
// src/lib/encryption.ts
export function encrypt(plaintext: string): string;   // AES-256-GCM → base64 "iv:ct:tag"
export function decrypt(ciphertext: string): string;  // inverse
export function hashCode(plaintext: string): string;  // SHA-256 hex digest

// publishBatch input/output
type PublishBatchInput = {
  cards: Array<{ amount: string; claimCode: string; pinCode?: string }>;
  brandId: string;
  countryId: string;
};
type PublishBatchResult =
  | { success: true; batchId: string; duplicates: string[] }
  | { success: false; error: string };

// Updated domain.ts Batch
interface Batch {
  id: string;
  createdAt: string;
  updatedAt?: string;
  sellRate: number;       // ← new
  isPaid: boolean;        // ← new
  giftcards: Giftcard[];
  payments: Payment[];
}

// Updated SellBatchManagerProps
interface SellBatchManagerProps {
  brands: Brand[];
  countries: Country[];
  sellRate: number;       // ← new (fetched server-side in page.tsx)
}
```

## Testing Strategy

No test runner is detected in this project. Manual verification checkpoints:

| Checkpoint | How |
|---|---|
| Encryption round-trip | Node REPL: `encrypt` then `decrypt` returns original |
| Duplicate rejection | Submit same claimCode twice; second batch returns `duplicates[]` with the code |
| Rate snapshot | Change `user.sellRate` after batch creation; verify old batch keeps original rate |
| `buyRate` snapshot | Change `user.buyRate` after order creation; `Order.buyRate` unchanged |
| Decryption in view | My Cards view shows readable codes in Details dialog |
| `price` removal | No TypeScript errors after migration; `getBuyerOrders` compiles without `price` |

## Migration / Rollout

1. **Schema migration**: `npx prisma migrate dev --name sell-flow-encryption`
   - Adds columns; removes `price`; adds `codeHash`; removes `@unique` from `claimCode`.
2. **Seed/existing data**: If any plaintext `claimCode` rows exist, run a one-off Node script:
   ```
   // scripts/migrate-encrypt-codes.ts
   // For each giftcard: read plaintext claimCode, compute codeHash, encrypt claimCode, update row.
   ```
   This must run **before** any new publishBatch calls, in the same deployment window.
3. **Env var**: Add `ENCRYPTION_KEY=<32-byte hex>` to `.env` and production secrets before deploying.

## Open Questions

- [ ] Should `confirmOrderUsage` use the stored `Order.buyRate` snapshot (preferred) or re-read `user.buyRate` at confirmation time? Currently reads from user — proposal says snapshot at creation; needs code change in `confirmOrderUsage`.
- [ ] The `@unique` constraint on `Giftcard.claimCode` must be dropped since AES-GCM with random IV yields non-deterministic ciphertext. Uniqueness moves to `codeHash`. Confirm this is acceptable (no existing code queries by `claimCode` directly after this change).
