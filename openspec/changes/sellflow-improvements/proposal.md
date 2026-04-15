# Change Proposal: sellFlow Improvements

## Intent

Improve the sellFlow across 5 dimensions:

1. **Unified dropzone**: Merge dropzone + thumbnail grid into a single container in both OCR and Proof Upload steps. Add `react-dropzone` for better DX.
2. **Clean slate on BrandStep return**: When user navigates back to Step 1, reset all flow state (entry mode, cards, images). User must complete the flow in one session or lose everything.
3. **Remove legacy fields**: Eliminate `validationState`, `extractedCode`, `extractedAmount`, `matchedImageId` from `SellFlowGiftcard`. All state flows through `evidence.*`.
4. **Proactive duplicate check**: Add a `checkDuplicates` server action so users see which codes already exist BEFORE trying to publish. Make it blocking in the UI.
5. **Spanish labels in DetailsStep**: Fix mixed English/Spanish labels in the manual entry step.

## Scope

### In scope

- `src/components/sell/steps/ocr-entry-step.tsx` — unified dropzone
- `src/components/sell/steps/proof-upload-step.tsx` — unified dropzone
- `src/components/sell/image-dropzone.tsx` — NEW shared component
- `src/hooks/use-sell-flow.ts` — resetToBrand action, remove legacy writes, remove legacy fields
- `src/types/flows/sell-flow.ts` — remove legacy fields from type
- `src/components/sell/steps/review-step.tsx` — remove legacy reads, show duplicate warnings
- `src/components/sell/sell-batch-manager.tsx` — clean-slate on back to step 1, remove legacy reads
- `src/components/sell/steps/details-step.tsx` — Spanish labels, duplicate pre-check
- `src/actions/seller-actions.ts` — new `checkDuplicates` action
- `package.json` — add `react-dropzone`

### Out of scope

- Memory optimization (compressedData stays in Zustand until publish — confirmed necessary)
- Database schema changes
- Changes to the OCR extraction pipeline

## Approach

1. Add `react-dropzone` and create shared `ImageDropzone` component
2. Add `resetToBrand()` action to Zustand store, wire it into navigation
3. Remove legacy fields from type, update all read/write sites
4. Add `checkDuplicates` server action, integrate into DetailsStep/ReviewStep
5. Fix DetailsStep labels to Spanish

## Impact

- ~10 files modified, 1 new file created
- Low risk: all changes are additive or cleanup
- The legacy field removal is the riskiest — requires updating all fallback chains
- The clean-slate change is behavioral — users lose data on back navigation (intentional)
