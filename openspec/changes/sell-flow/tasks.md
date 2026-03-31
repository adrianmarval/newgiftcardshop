# Tasks: Sell Flow & Dynamic Economic Model

## Phase 1: Foundation

- [ ] 1.1 Atomic schema migration — modify `prisma/schema.prisma` to remove `Giftcard.price`, drop `@unique` from `claimCode`, add `Giftcard.codeHash`, `GiftcardBatch.sellRate`, `GiftcardBatch.isPaid`, and `Order.buyRate`; generate `prisma/migrations/*` with `npx prisma migrate dev --name sell-flow-encryption`. Acceptance: Prisma validates, migration SQL exists, duplicate `codeHash` is DB-enforced.
- [ ] 1.2 Crypto boundary — create `src/lib/encryption.ts` with AES-256-GCM `encrypt/decrypt` and SHA-256 `hashCode`; add `ENCRYPTION_KEY` docs to `.env.example`. Acceptance: ciphertext format is self-contained, key is env-only, decrypt(encrypt(x)) round-trips manually.
- [ ] 1.3 Domain/type sync — update `src/types/domain.ts` and `src/types/flows.ts` to remove `price` fields and add `sellRate`/`isPaid` shape changes. Acceptance: exported types match schema/design and no stale `price` contract remains in these files.

## Phase 2: Server Logic

- [ ] 2.1 Seller publish pipeline — update `src/actions/seller-actions.ts` to add `publishBatch`, validate inputs, snapshot `user.sellRate`, hash codes, filter duplicates, encrypt secrets, and create batch+cards in one transaction. Acceptance: returns `{ success, batchId, duplicates }` for partial duplicates and rejects fully invalid/duplicate submissions.
- [ ] 2.2 Seller batch reads — extend `src/actions/seller-actions.ts` `getSellerBatches` to decrypt codes, convert Decimal fields, expose `sellRate`/`isPaid`, and compute server-side payout totals from effective amounts. Acceptance: seller batches return readable codes and correct payout math for USED/WRONG_AMOUNT/INVALID cards.
- [ ] 2.3 Buyer/order rate snapshot — update `src/actions/order-actions.ts` so `createOrder` stores `Order.buyRate`, `confirmOrderUsage` uses the stored snapshot, and `getBuyerOrders` drops `price` mapping. Acceptance: order creation persists buyRate and downstream reads compile without `price`.
- [ ] 2.4 Giftcard reads without price — update `src/actions/giftcard-actions.ts` so `getOrderCards` decrypts `claimCode`/`pinCode` and `searchGiftcards` stops returning `price`. Acceptance: buyer-facing card reads expose plaintext codes and search payload matches new types.

## Phase 3: UI Wiring

- [ ] 3.1 Sell page data plumbing — update `src/app/(dashboard)/sell/dashboard/sell-cards/page.tsx` to fetch the seller `sellRate` server-side and pass it into `SellBatchManager`. Acceptance: page renders wizard with real rate and no hardcoded fallback.
- [ ] 3.2 Sell wizard publish integration — update `src/components/sell/sell-batch-manager.tsx` and `src/components/sell/steps/review-step.tsx` to use the real `publishBatch` action, display actual `sellRate`, and surface success/duplicate/error states. Acceptance: submitting from UI calls the server action and review totals match the passed rate.
- [ ] 3.3 Seller cards payout view — update `src/components/sell/seller-cards-view.tsx` to remove `price` usage, show `isPaid` badge/state, and render payout estimates from server-provided/effective amounts × `sellRate`. Acceptance: paid batches are labeled and the sample USED + WRONG_AMOUNT + INVALID scenario yields the expected payout.

## Phase 4: Verification

- [ ] 4.1 Static verification — run `npx tsc --noEmit` and `npm run lint` after all code changes. Acceptance: both commands pass with no type or lint errors.
- [ ] 4.2 Manual sell-flow checks — verify encryption round-trip, duplicate rejection, persisted `sellRate`/`buyRate` snapshots after user rate changes, and decrypted codes in seller/buyer views. Acceptance: all spec checkpoints pass without reintroducing `Giftcard.price`.

## Dependencies & Parallelization

- Dependency order: 1.1 → 1.2/1.3 → 2.1 → 2.2/2.3/2.4 → 3.1 → 3.2/3.3 → 4.1/4.2.
- Parallelizable after 1.1-1.3: tasks 2.3 and 2.4 can run in parallel; after 2.2 and 3.1, tasks 3.2 and 3.3 can run in parallel.
