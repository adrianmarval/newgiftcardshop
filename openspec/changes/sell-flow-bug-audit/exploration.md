# Exploration: sell-flow-bug-audit

## Current State

The sell flow is a 4-step wizard (Brand → Details → Proof Upload → Review). Step 3 (`ProofUploadStep`) handles image upload, AI vision extraction, and claim code/amount matching. It uses a **dual-state architecture** that is the root cause of most bugs:

- **Zustand store** (`useSellFlow`): holds `giftcards[]` with per-card `validationState`, `extractedAmount`, `matchedImageId`
- **Local `useState`** (`validationResults`, `unmatchedImages`): holds the server response from `validateGiftCardImages` action

These two stores are **only synchronized in one direction** (server → both stores on validate). User correction actions (buttons) only update Zustand, leaving `validationResults` stale. `allVerified` — which gates the Continue button — reads exclusively from the stale local state.

---

## Bug List

### BUG 1 — Amount comparison: "30" ≠ "30.00" (string equality)

|                |                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**   | Critical                                                                                                                         |
| **File**       | `src/actions/giftcard-validation-actions.ts:54,168-171`                                                                          |
| **Root cause** | `normalizeAmount()` only strips `$` and `,`. Compares `"30" !== "30.00"` as strings → `amount_mismatch` is incorrectly triggered |
| **Fix**        | Replace string equality with `parseFloat()` comparison: `parseFloat(extractedNorm) !== parseFloat(cardNorm)`                     |

---

### BUG 2 — "Usar X" / "Confirmar" buttons are UX dead ends (state desync)

|                |                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**   | Critical                                                                                                                                                                                                                                                                                                                                                                               |
| **File**       | `src/components/sell/steps/proof-upload-step.tsx:154–163, 498, 520`                                                                                                                                                                                                                                                                                                                    |
| **Root cause** | `allVerified` is derived from `validationResults` (local `useState`). Both "Usar X" (`amount_mismatch`) and "Confirmar" (`fuzzy_match`) call `setCardValidationResult()` which updates Zustand only. The local `validationResults` is never updated → `resultsMap` stays stale → `allVerified` stays `false` → **Continue button permanently disabled**. The user is completely stuck. |
| **Fix**        | After user corrections, also update `validationResults` local state. OR: derive `allVerified` from Zustand's `giftcards` array instead of local `validationResults`. The simpler fix is: `const allVerified = giftcards.every(g => g.validationState === 'verified' && g.matchedImageId)`                                                                                              |

---

### BUG 3 — `suggestedAmount` is the user's own amount, not the AI-extracted amount

|                |                                                                                                                                                                                                                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**   | Critical                                                                                                                                                                                                                                                                                                                            |
| **File**       | `src/actions/giftcard-validation-actions.ts:177`                                                                                                                                                                                                                                                                                    |
| **Root cause** | `suggestedAmount: card.amount` — this is what the **user typed**, not what AI detected. The UI shows `Detectado: $X` (correct) and `Usar $result.suggestedAmount` which is the SAME value already in the form. Clicking the button offers to "use" the same amount the user already entered — semantically backwards and pointless. |
| **Fix**        | Change to `suggestedAmount: match.extractedAmount ?? undefined`. The button should offer to accept the AI-detected value, not confirm the user's existing input.                                                                                                                                                                    |

---

### BUG 4 — "Usar X" and "Confirmar" lose `matchedImageId`

|                |                                                                                                                                                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**   | High                                                                                                                                                                                                                                                                                                                                                                      |
| **File**       | `src/components/sell/steps/proof-upload-step.tsx:498, 520`                                                                                                                                                                                                                                                                                                                |
| **Root cause** | Both buttons call `setCardValidationResult(card.id, 'verified', undefined, ...)` without passing the 5th argument (`matchedImageId`). The Zustand store then persists `matchedImageId: undefined` for the `??` short-circuit. Result: at `publishBatch` time, `handlePublish` looks up `g.matchedImageId` which is now `undefined` → no proof image is sent for the card. |
| **Fix**        | Pass `result.matchedImageId` as the 5th argument in both buttons.                                                                                                                                                                                                                                                                                                         |

---

### BUG 5 — `matchClaimCode` skips primary card from fuzzy matching

|                |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**   | High                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **File**       | `src/lib/giftcard-vision.ts:157–172`                                                                                                                                                                                                                                                                                                                                                                                           |
| **Root cause** | The fuzzy loop (`for (const card of allCardCodes)`) skips the primary card (the one being tested). If OCR produces a 1-char error on the correct card's code (e.g., `KLMN` → `KLMM`), exact match fails and the primary is skipped in the fuzzy loop → result is `no_capture` instead of `fuzzy_match`. The fuzzy algorithm only catches OCR errors on _other_ cards. Also: `allCardCodes.find(...)` inside the loop is O(n²). |
| **Fix**        | Remove the `continue` skip for primary card in the fuzzy loop. Pre-compute the primary card id before the loop to avoid O(n²).                                                                                                                                                                                                                                                                                                 |

---

### BUG 6 — `processing_error` is dead code; Reintentar button never works

|                |                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**   | Medium                                                                                                                                                                                                                                                                                                                                                                          |
| **File**       | `src/components/sell/steps/proof-upload-step.tsx:136–148, 155–156`                                                                                                                                                                                                                                                                                                              |
| **Root cause** | `validateGiftCardImages` action never returns `processing_error` state. Extraction failures go to `unmatchedImages`, not to `results`. `failedCount` is always `0`. The Reintentar button never renders. Even if it did: `handleRetryFailed` filters by `result.matchedImageId` which is `undefined` for processing errors → `imagesToRetry` is empty → retry call never fires. |
| **Fix**        | Either: (A) remove dead code and handle extraction errors properly by mapping failed images back to the `results[]` with `processing_error` state; or (B) simplify: retry all images for unverified cards.                                                                                                                                                                      |

---

### BUG 7 — Review step: hardcoded "All cards verified" + missing publish guard

|                |                                                                                                                                                                                                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----------------------------------------------------- |
| **Severity**   | Medium                                                                                                                                                                                                                                                                                                                        |
| **File**       | `src/components/sell/steps/review-step.tsx:63–64, 90–95`                                                                                                                                                                                                                                                                      |
| **Root cause** | (A) Line 63: `<span>All cards verified</span>` is hardcoded — it always shows even if `verifiedCount < giftcards.length`. (B) Publish button `disabled={isPublishing}` only — no check that all cards are verified. A seller could theoretically navigate directly to step 4 (via `setStep(4)`) and publish unverified cards. |
| **Fix**        | (A) Conditionally render the "All verified" message based on `verifiedCount === giftcards.length`. (B) Add `disabled={isPublishing                                                                                                                                                                                            |     | verifiedCount < giftcards.length}` to Publish button. |

---

### BUG 8 (minor) — Validar button not disabled while AI is processing

|                |                                                       |
| -------------- | ----------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**   | Low                                                   |
| **File**       | `src/components/sell/steps/proof-upload-step.tsx:244` |
| **Root cause** | `disabled={images.length === 0                        |     | isUploading}`—`isValidating` is NOT included. While AI processes, the user can click Validar again triggering a second concurrent request. |
| **Fix**        | Add `                                                 |     | isValidating` to the disabled condition.                                                                                                   |

---

## Affected Areas

- `src/actions/giftcard-validation-actions.ts` — BUG 1 (amount comparison), BUG 3 (suggestedAmount), BUG 6 (processing_error)
- `src/components/sell/steps/proof-upload-step.tsx` — BUG 2 (allVerified state desync), BUG 4 (matchedImageId lost), BUG 6 (retry logic), BUG 8 (disabled state)
- `src/lib/giftcard-vision.ts` — BUG 5 (matchClaimCode primary card skip)
- `src/components/sell/steps/review-step.tsx` — BUG 7 (hardcoded text, missing publish guard)

---

## Approaches

### Option A — Surgical per-bug fixes

Fix each bug independently in its own commit. No architectural change.

- **Pros**: Low risk, easy to review, minimal surface area per change
- **Cons**: BUG 2 still leaves dual-state (fragile); doesn't prevent future desync
- **Effort**: Low

### Option B — Eliminate dual-state, derive everything from Zustand

Remove `validationResults` local state entirely. Derive `allVerified`, `verifiedCount`, `failedCount`, `resultsMap` from `giftcards` in Zustand. Keep `unmatchedImages` in local state (not card-specific). Fix all other bugs simultaneously.

- **Pros**: Eliminates root cause of BUG 2 permanently; simpler mental model; single source of truth
- **Cons**: Larger refactor; need to persist enough data in Zustand per-card for display (extractedCode, extractedAmount, matchedImageId already stored there)
- **Effort**: Medium

### Recommendation

**Option B** for BUG 2 (eliminate dual-state), combined with **surgical fixes** for BUG 1, 3, 4, 5, 7, 8. The dual-state is inherently fragile and will regrow bugs if left in place.

**Priority order**: BUG 1 → BUG 2 → BUG 3 → BUG 4 → BUG 5 → BUG 7 → BUG 8 → BUG 6 (lowest, dead code)

---

## Risks

- **BUG 5 fix** (matchClaimCode primary card fuzzy): could slightly increase false-positive fuzzy matches. The threshold of `distance ≤ 2` is already conservative; including the primary card is strictly more correct.
- **BUG 2 fix** (Zustand-driven allVerified): if `matchedImageId` is correctly passed (BUG 4 fix), the logic becomes `giftcards.every(g => g.validationState === 'verified' && g.matchedImageId)` which is clean. Must coordinate with BUG 4 fix.
- Bugs 1, 3, 7, 8 are purely local — zero risk.

---

## Ready for Proposal

**Yes.** All bugs confirmed with root causes. Changes are isolated and the fix strategy is clear. Recommend proceeding to `sdd-propose` phase.
