# Change Proposal: Sell Flow & Dynamic Economic Model

## 1. Intent
Implement the complete sell flow for the seller dashboard. This includes publishing gift card batches directly to the marketplace, calculating dynamic prices based on `sellRate` and `buyRate` snapshots, ensuring AES-256-GCM encryption for claim codes and PINs, and providing accurate payout calculations for the manual admin payment workflow.

## 2. Business Rules
- **Economic Model**:
  - `Giftcard.price` is removed. It is calculated dynamically: `Amount × Rate`.
  - Admin keeps the margin between `Order.buyRate` and `GiftcardBatch.sellRate`.
  - `WRONG_AMOUNT` cards are paid based on `reportedAmount`, not original amount.
- **Rate Snapshot**:
  - Freeze `sellRate` on `GiftcardBatch` creation.
  - Freeze `buyRate` on `Order` creation.
  - Rate changes by admin after these events do not affect existing batches/orders.
- **Security & Duplicates**:
  - `Giftcard.claimCode` and `pinCode` encrypted symmetrically (AES-256-GCM).
  - Deterministic duplicate checking via a new `codeHash` field (SHA-256).
  - Only duplicate cards are rejected during batch creation, not the whole batch (enforced in the server action).
- **Seller Restrictions**:
  - Cards go directly to the marketplace.
  - Sellers cannot edit/delete published cards or see who bought them.
  - Cards are marked `isConfirmed` when the buyer confirms them.
- **Seller Payment**:
  - Manual process by admin per COMPLETE BATCH.
  - Amount = `sum(effectiveAmounts) × batch.sellRate`.
  - Paid via `PaymentMethod` as a `CREDIT` transaction.
  - Sets `GiftcardBatch.isPaid = true` when complete.

## 3. Scope of Changes

### 3.1 Schema Migration (Prisma)
- **`GiftcardBatch`**:
  - Add `sellRate Decimal? @db.Decimal(10, 4)`
  - Add `isPaid Boolean @default(false)`
- **`Order`**:
  - Add `buyRate Decimal? @db.Decimal(10, 4)`
- **`Giftcard`**:
  - Remove `price Decimal`
  - Add `codeHash String @unique` (for duplicate detection)
  - `claimCode` and `pinCode` will now store encrypted values.

### 3.2 Encryption Utility (`src/lib/encryption.ts`)
- Implement AES-256-GCM encryption and decryption.
- Implement SHA-256 hashing for `codeHash`.
- Require `ENCRYPTION_KEY` (32 bytes) in `.env`.

### 3.3 Server Actions
- **`src/actions/seller-actions.ts`**:
  - Create `publishBatch(cards, brandId, countryId)`: Fetch `user.sellRate`, hash incoming codes to detect and reject duplicates, encrypt codes/PINs, and insert `GiftcardBatch` with the `sellRate` snapshot.
  - Update `getSellerBatches()`: Calculate dynamic "Total Amount" based on `sellRate` (replacing `.price` logic), and decrypt `claimCode`/`pinCode` before sending to UI.
- **`src/actions/order-actions.ts`** & **`src/actions/giftcard-actions.ts`**:
  - Update `createOrder` to capture and store `user.buyRate` on the `Order`.
  - Update `getGiftcardsForOrder` to decrypt codes.

### 3.4 Seller Dashboard UI
- **Sell Wizard (`src/components/sell/sell-batch-manager.tsx`)**:
  - Receive `sellRate` from the page and pass it to steps.
  - Replace the stub `handlePublish` with the real `publishBatch` Server Action.
- **Review Step (`src/components/sell/steps/review-step.tsx`)**:
  - Replace hardcoded `0.85` rate with the user's actual `sellRate`.
- **My Cards Page (`src/components/sell/seller-cards-view.tsx`)**:
  - Update payout estimation logic to use `effectiveAmount` rules (`USED=$amount`, `WRONG_AMOUNT=$reportedAmount`, else `$0`) multiplied by `batch.sellRate`.
  - Remove UI references to `card.price` and rely on `amount` and `sellRate`.
  - Reflect the `isPaid` status for batches.

## 4. Out of Scope
- Admin UI for making the seller payments.
- Real-time notifications and dashboard stats.
- Binance API integration.

## 5. Risks & Considerations
- **Encryption Key Management**: Losing `ENCRYPTION_KEY` means all cards in the DB are unrecoverable. Must document environment setup clearly.
- **Downtime during Migration**: Removing `Giftcard.price` will temporarily break code until all UI/actions are updated. This change must be applied atomically.
- **Concurrency / Race Conditions**: Duplicates can theoretically occur if identical claim codes are submitted in precisely parallel requests. The `@unique` constraint on `codeHash` handles this at the DB level.

## 6. Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Update Giftcard, Order, and GiftcardBatch models. |
| `src/lib/encryption.ts` | New | Add AES-256-GCM and SHA-256 utilities. |
| `src/actions/seller-actions.ts` | Modified | Add `publishBatch` action, update `getSellerBatches`. |
| `src/actions/order-actions.ts` | Modified | Snapshot `buyRate` on Order creation. |
| `src/actions/giftcard-actions.ts` | Modified | Decrypt codes on fetch. |
| `src/components/sell/` | Modified | Wire real publish action, use dynamic rates, handle `isPaid`. |

## 7. Rollback Plan
- Revert the `prisma/schema.prisma` changes (restore `price`, remove `codeHash`, `sellRate`, `buyRate`).
- Reverse migration: `npx prisma db push` (Note: existing encrypted codes would be lost if rolled back after production use; a script to decrypt and restore to plaintext is required for a safe downgrade).
- Revert UI components and Server Actions to previous commits.

## 8. Success Criteria
- [ ] Sellers can publish batches and see the exact expected payment calculated via their `sellRate`.
- [ ] Admin sees exactly how much to pay per batch (sum of effective amounts * sellRate).
- [ ] `claimCode` and `pinCode` are securely encrypted in the database.
- [ ] Duplicate claim codes are successfully rejected using the `codeHash` blind index.
- [ ] The `buyRate` is safely snapshotted on new orders.
