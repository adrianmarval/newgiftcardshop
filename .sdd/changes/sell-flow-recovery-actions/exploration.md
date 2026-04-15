# Exploration: sell-flow-recovery-actions

## Current State

The sell flow is a 4-step wizard (Brand → Details → Proof Upload → Review) managed by a Zustand store (`use-sell-flow.ts`). Step 3 (ProofUploadStep) has two internal phases — `upload` and `validate` — driven by local `useState`.

### State ownership

| Layer | Owns |
|-------|------|
| Zustand (`useSellFlow`) | `giftcards[]`, `images[]`, `validationState/extractedCode/extractedAmount/matchedImageId` per card |
| Local `useState` in ProofUploadStep | `validationResults[]` (server response snapshot), `unmatchedImages[]`, `phase`, `isValidating`, `isUploading` |

### Continue gate (proof step → review)

```ts
// proof-upload-step.tsx L161
const allVerified = giftcards.length > 0 &&
  giftcards.every((card) => card.validationState === 'verified' && card.matchedImageId);
```

`giftcards` comes from Zustand. The gate is **purely derived** — any mutation to `giftcards[]` in Zustand is reflected immediately in the next render.

### One-image-per-card rule

Enforced server-side in `matchExtractionsToCards` (giftcard-validation-actions.ts). A card can receive at most one match; exact wins over fuzzy; a second image claiming the same code is pushed to `unmatchedImages`. No client-side enforcement is needed beyond "replace = remove old + add new".

### publishBatch data path

`handlePublish` in `sell-batch-manager.tsx` iterates `giftcards`, looks up `card.matchedImageId → images[]`, and passes `compressedData` to the server action for encryption-at-rest. Only cards present in `giftcards[]` at publish time are sent.

### Existing `removeGiftcard`

Present in Zustand. Surfaced **only** in DetailsStep (step 2). Has a last-card guard: `giftcards.length > 1`. Not surfaced in ProofUploadStep.

---

## Affected Areas

| File | Why |
|------|-----|
| `src/hooks/use-sell-flow.ts` | Add new Zustand actions: `removeFromBatch(id)`, `undoRemoveFromBatch()`. Add `removedFromBatch` stack to state + type. |
| `src/types/flows/sell-flow.ts` | Add `removedFromBatch` field and new action signatures to `SellFlowState`. Add `RemovedBatchEntry` type. |
| `src/components/sell/steps/proof-upload-step.tsx` | Add recovery UI per card row: "Reemplazar captura" (replace) and "Quitar del lote" (remove). Add undo toast/button. Sync local `validationResults` on removal. |
| `src/actions/giftcard-validation-actions.ts` | No changes needed for replace (full re-validation reuses existing logic). Possible: scoped re-validation (optional optimization). |
| `src/components/sell/types.ts` | No changes anticipated. |

---

## Approaches

### Action 1: Replace capture

#### Option A — Full re-validation (recommended)
Remove the old matched image from `images[]` (via `removeImage`), upload the new file, then re-run `validateGiftCardImages` with the full updated `images[]` + current `giftcards[]`.

- **Pros**: Reuses existing server action verbatim. Handles edge cases where the new image actually matches a *different* card. Consistent state.
- **Cons**: Re-validates all cards (wasted AI calls for already-verified cards). Minor latency for large batches.
- **Effort**: Low — purely UI wiring + existing action call.

#### Option B — Scoped re-validation
Add a new server action that validates a single image against a single card.

- **Pros**: Faster for large batches.
- **Cons**: Increases server action surface. Must manually handle state merge back into `validationResults`. Doesn't catch cross-card conflicts.
- **Effort**: Medium.

**Recommendation**: Option A. The batch is small (typical sell flow), latency is acceptable, and no new server code is needed.

---

### Action 2: Remove card from batch with undo

#### Option A — Zustand `removedFromBatch` stack (reversible) ✅ CHOSEN BY USER
Add a new `removedFromBatch: RemovedBatchEntry[]` array to Zustand state. Each entry stores `{ card: SellFlowGiftcard, originalIndex: number }`. Removal moves the card from `giftcards[]` to `removedFromBatch[]`. Undo pops the last entry and splices the card back at `originalIndex`.

```ts
interface RemovedBatchEntry {
  card: SellFlowGiftcard;
  originalIndex: number;
}
```

- **Pros**: Fully reversible. Zustand-owned (survives re-renders). Clear semantics. UI can show an undo banner. Consistent with the gate (re-inserting a `no_capture` card immediately blocks Continue again).
- **Cons**: Need to sync local `validationResults` in ProofUploadStep (filter on remove, no restoration needed since re-validation handles it on undo re-insert).
- **Effort**: Low.

#### Option B — Soft-hide with `excluded` flag
Add `excluded?: boolean` to `SellFlowGiftcard`. The gate and publish skip excluded cards.

- **Pros**: Simple state toggle. Card data always present.
- **Cons**: Gate logic, publish logic, stats counters, and card list rendering all need conditional filtering. More scattered changes. "Undo" is just toggling the flag back.
- **Effort**: Low-Medium but more coupled.

**Recommendation**: Option A (already user-confirmed). Cleaner separation of concerns.

---

### Recalculating progress after removal/undo

**No explicit recalculation needed.** The `allVerified` gate is derived reactively from `giftcards[]`. Removing a card means the removed card no longer participates in `every()`. Re-inserting it re-includes it — if it still has `no_capture` state, the gate re-blocks.

The only sync needed:
1. On remove: filter `validationResults` local state by `cardId !== removedId` (prevents stale UI rendering in `validate` phase).
2. On undo: trigger a new full validation (simplest) OR rely on the existing `validationState` still on the re-inserted card object. If the card had `no_capture`, it re-blocks immediately and the seller must upload a new image. This is the correct behavior per spec.

---

### Preserving the one-image-per-card rule

- **Replace flow**: Remove the old `matchedImageId` image from `images[]` before uploading the new one. This prevents the AI from seeing two potential captures for the same code. The server-side rule handles ties regardless, but removing the old image is cleaner and avoids ambiguity.
- **Remove flow**: The orphaned image (previously matched to the removed card) stays in `images[]`. It doesn't corrupt state — `handlePublish` only iterates `giftcards`. On re-validation, the server will try to match it to remaining cards (may become unmatched). This is acceptable — the image is not automatically deleted.

---

## Edge Cases

1. **Last card in batch**: `removeFromBatch` must use the same guard as `removeGiftcard` — disallow if `giftcards.length === 1`. The batch must have ≥1 card.
2. **Remove then undo while validating**: If the seller triggers undo while `isValidating` is true, the re-inserted card would have its old `validationState`. This is fine — after the pending validation completes, results are written to Zustand by `cardId`. If the card's `id` is back in `giftcards[]`, it will be updated.
3. **Multiple undos**: The `removedFromBatch` stack supports multiple entries. Each undo pops the last one (LIFO). Original index insertion may shift if multiple cards were removed (indices computed at removal time).
4. **Replace on a `fuzzy_match` or `amount_mismatch` card**: Valid. The `matchedImageId` is already set on those cards. Remove that image, upload new, re-validate.
5. **Replace when no image is matched yet (`no_capture`)**: No image to remove. Simply upload a new image and re-validate.
6. **`resetValidation`**: Already clears `images` and all per-card validation fields. The `removedFromBatch` stack should also be cleared on `resetValidation` and `resetForm`. Need to add to Zustand.

---

## Recommendation

Implement both recovery actions in step 3 (validate phase only):

1. **Replace capture**: "Reemplazar captura" button per card in any non-`verified` state. Opens file picker inline (no modal needed). On file selected → remove old matched image (if any) → upload new → full re-validate.

2. **Remove from batch**: "Quitar del lote" button per card in `no_capture` / non-resolvable state. Invokes `removeFromBatch(id)` in Zustand. Show a `sonner` toast with "Deshacer" action calling `undoRemoveFromBatch()`. Sync local `validationResults` by filtering out the removed `cardId`.

Both actions are surfaced **only** in the `validate` phase, not the `upload` phase. This keeps the upload phase clean.

---

## Ready for Proposal

**Yes.** The design is clear, constraints are identified, and the user has already confirmed Model A (reversible removal). The proposal should capture: intent, scope (Zustand + ProofUploadStep UI only), and the two actions with their data flow.
