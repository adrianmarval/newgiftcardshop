# Technical Design: sellFlow Improvements

## Architecture Decisions

### 1. Unified Dropzone — Shared Component Pattern

Create `src/components/sell/image-dropzone.tsx` as a single source of truth for image upload UI. Both `OcrEntryStep` and `ProofUploadStep` import and use it.

**Props interface:**

```ts
interface ImageDropzoneProps {
  images: Array<{ id: string; previewUrl: string }>;
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  emptyLabel?: string;
  emptySublabel?: string;
  maxHeight?: string;
}
```

**Library choice:** `react-dropzone` — zero dependencies, well-maintained, gives us `File` objects natively, handles edge cases (file type filtering, multiple files, drag rejection, accessibility).

**Layout approach:**

- Single container with `getRootProps()` from react-dropzone
- When `images.length === 0`: show centered upload prompt (icon + text)
- When `images.length > 0`: show thumbnail grid with remove buttons + "Add more" button as last item
- "Limpiar todo" button appears as a small overlay in the top-right when images exist
- Drag-active styling applies to the entire container

### 2. Clean Slate — Navigation Interceptor

Add `resetToBrand()` to the Zustand store. The reset is triggered at the **navigation layer** in `sell-batch-manager.tsx`, not in the BrandStep itself.

**Why not in BrandStep?** Because BrandStep has no "back" button — it's always step 1. The reset must happen when navigating FROM a later step TO step 1.

**Implementation:**

```ts
// In use-sell-flow.ts
resetToBrand: () => set((state) => ({
  step: 1,
  entryMode: null,
  giftcards: [makeBlankCard('1')],
  images: [],
  unmatchedImages: [],
  lastRemovedCard: null,
  // Preserve: selectedBrand, selectedCountry
})),
```

In `sell-batch-manager.tsx`, wrap the back navigation:

```ts
function handleBack(targetStep: number) {
  if (targetStep === 1) {
    resetToBrand();
  } else {
    setStep(targetStep);
  }
}
```

The "Volver" buttons in each step component call `setStep(getBackStep())` — we change this to call `handleBack(getBackStep())` from the manager.

**Alternative considered:** Watch `step` changes in a useEffect and reset when it goes to 1. Rejected because it's implicit and hard to debug. Explicit is better.

### 3. Legacy Fields Removal — Big Bang Migration

All legacy fields are removed in a single pass. No gradual migration because:

- The `evidence.*` sub-object is already the canonical source for all writes
- The fallback chains are defensive but unnecessary — all writes go to both places
- A gradual migration would leave the codebase in a worse state temporarily

**Migration order:**

1. Update all WRITE sites in `use-sell-flow.ts` to stop writing legacy fields
2. Update all READ sites in components to remove `?? card.legacyField` fallbacks
3. Remove legacy fields from `SellFlowGiftcard` type
4. TypeScript will catch any missed references

### 4. Duplicate Check — Extracted Utility + New Action

**Shared utility:** `src/lib/duplicate-checker.ts`

```ts
export async function findExistingCodes(claimCodes: string[]): Promise<string[]>;
```

This function:

1. Normalizes each code with `normalizeClaimCode`
2. Hashes with `hashCode`
3. Queries `prisma.giftcard.findMany({ where: { codeHash: { in: hashes } } })`
4. Returns the original codes that have matching hashes

**Server action:** `checkDuplicates` in `seller-actions.ts`

- Input: `{ codes: string[] }`
- Output: `{ duplicates: string[] }`
- Uses the shared utility

**UI integration:**

- In `DetailsStep`: call on "Continuar" click, show alert if duplicates found, block navigation
- In `ReviewStep`: call on "Publicar Lote" click as pre-flight, block publish if duplicates found

**Why not just rely on publishBatch?** Because the user sees the error AFTER trying to publish, which is a bad UX. Pre-checking lets them fix issues before the expensive publish operation.

### 5. Spanish Labels — Direct String Replacement

Simple find-and-replace in `details-step.tsx`. No i18n infrastructure needed — the app is monolingual Spanish.

## File Change Matrix

| File                                              | Change Type | Description                                 |
| ------------------------------------------------- | ----------- | ------------------------------------------- |
| `src/components/sell/image-dropzone.tsx`          | **NEW**     | Shared dropzone component                   |
| `src/hooks/use-sell-flow.ts`                      | Modify      | Add `resetToBrand`, remove legacy writes    |
| `src/types/flows/sell-flow.ts`                    | Modify      | Remove legacy fields from type              |
| `src/components/sell/steps/ocr-entry-step.tsx`    | Modify      | Use ImageDropzone, remove legacy reads      |
| `src/components/sell/steps/proof-upload-step.tsx` | Modify      | Use ImageDropzone, remove legacy reads      |
| `src/components/sell/steps/review-step.tsx`       | Modify      | Remove legacy reads, add duplicate check    |
| `src/components/sell/sell-batch-manager.tsx`      | Modify      | Clean-slate navigation, remove legacy reads |
| `src/components/sell/steps/details-step.tsx`      | Modify      | Spanish labels, duplicate pre-check         |
| `src/actions/seller-actions.ts`                   | Modify      | Add `checkDuplicates` action                |
| `src/lib/duplicate-checker.ts`                    | **NEW**     | Shared duplicate check utility              |
| `package.json`                                    | Modify      | Add `react-dropzone`                        |

## Risks

1. **Legacy field removal**: If any component still reads a legacy field after removal, TypeScript will catch it at compile time. Low risk.
2. **Clean slate navigation**: If reset is called at the wrong time (e.g., internal phase change), user loses data. Mitigated by explicit trigger in the manager, not implicit state watching.
3. **react-dropzone**: Adds a dependency. Mitigated by the fact that it's the most popular library for this use case (2M+ weekly downloads).
4. **Duplicate check performance**: Querying `codeHash IN (...)` with 100 codes is fast (indexed unique column). No performance concern.
