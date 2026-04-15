# Specifications: sellFlow Improvements

## Spec 1: Unified Dropzone with Thumbnails

### Requirement

Both `OcrEntryStep` and `ProofUploadStep` must display uploaded image thumbnails INSIDE the drop area, not as a separate block below it.

### Scenarios

**Scenario 1: Empty dropzone**

- GIVEN the user is on the upload phase of either OCR or Proof Upload step
- WHEN no images have been uploaded
- THEN the dropzone shows the upload prompt text and icon centered in the area
- AND the area is clickable to open the file picker

**Scenario 2: Thumbnails inside dropzone**

- GIVEN the user has uploaded one or more images
- THEN the thumbnails are displayed as a grid INSIDE the same dropzone container
- AND the dropzone text/icon is replaced by the thumbnail grid
- AND each thumbnail has a remove button (X) in the top-right corner
- AND the last item in the grid is an "Add more" button that opens the file picker
- AND drag-and-drop still works over the entire area (including over thumbnails)

**Scenario 3: Drag-over state with thumbnails**

- GIVEN thumbnails are visible in the dropzone
- WHEN the user drags files over the area
- THEN the entire area highlights with the drag-active styling (border-primary, bg-primary/5, scale)
- AND the thumbnails remain visible during drag

**Scenario 4: Clear all images**

- GIVEN there are thumbnails in the dropzone
- WHEN the user clicks "Limpiar todo"
- THEN all images are removed from the store
- AND the dropzone returns to the empty state with the upload prompt

### Technical constraints

- Use `react-dropzone` library for the drag-and-drop surface
- Create a shared `src/components/sell/image-dropzone.tsx` component used by both steps
- The component accepts: `images`, `onAdd`, `onRemove`, `onClear`, `maxHeight` props
- Preserve the existing upload flow (uploadProvenanceImage server action, compressedData storage)

---

## Spec 2: Clean Slate on BrandStep Return

### Requirement

When the user navigates back to Step 1 (BrandStep) from any subsequent step, all flow state must be reset.

### Scenarios

**Scenario 1: Back from Step 2 (Details or OCR)**

- GIVEN the user is on Step 2 with cards added
- WHEN the user clicks "Volver" to go back to Step 1
- THEN `resetToBrand()` is called before navigation
- AND `entryMode` is set to `null`
- AND `giftcards` is reset to `[makeBlankCard('1')]`
- AND `images` is cleared
- AND `unmatchedImages` is cleared
- AND `lastRemovedCard` is cleared
- AND `step` is set to 1
- AND `selectedBrand` and `selectedCountry` are preserved

**Scenario 2: Back from Step 3 or 4 (Proof Upload / Review)**

- GIVEN the user is on Step 3 or 4 with cards and images
- WHEN the user navigates back through steps to Step 1
- THEN the same reset behavior as Scenario 1 applies
- AND the mode selector appears again when they reach Step 2

**Scenario 3: Internal phase navigation does NOT reset**

- GIVEN the user is in the upload phase of ProofUploadStep
- WHEN they switch to the validate phase (internal component state)
- THEN NO reset occurs
- AND when they navigate back within the step, state is preserved

**Scenario 4: After successful publish**

- GIVEN the user has successfully published a batch
- WHEN they click "Volver al Dashboard"
- THEN `resetForm()` is called (full reset including brand/country)
- AND this behavior is unchanged from current

### Implementation

- Add `resetToBrand()` action to Zustand store that preserves brand/country but resets everything else
- Modify the back navigation in `sell-batch-manager.tsx` to call `resetToBrand()` when target step is 1
- The `getBackStep()` function should trigger reset when returning `1`

---

## Spec 3: Remove Legacy Fields

### Requirement

The `SellFlowGiftcard` interface must not contain deprecated legacy fields. All evidence state must flow through the `evidence.*` sub-object.

### Fields to remove from `SellFlowGiftcard`

- `validationState?: ValidationState`
- `extractedCode?: string`
- `extractedAmount?: string`
- `matchedImageId?: string`

### Scenarios

**Scenario 1: Read sites use evidence only**

- GIVEN any component reads card evidence state
- WHEN accessing status, extractedCode, extractedAmount, or matchedImageId
- THEN it reads from `card.evidence.status`, `card.evidence.extractedCode`, etc.
- AND there are NO `?? card.validationState` fallback chains

**Scenario 2: Write sites update evidence only**

- GIVEN any store action writes evidence state
- WHEN updating status, extractedCode, extractedAmount, or matchedImageId
- THEN it writes to `evidence.status`, `evidence.extractedCode`, etc.
- AND there are NO dual-writes to legacy flat fields

**Scenario 3: Type validation**

- GIVEN the `SellFlowGiftcard` type is used
- WHEN TypeScript compiles
- THEN there are no legacy field references in the type definition
- AND all components compile without errors using only `evidence.*`

### Affected actions in use-sell-flow.ts

- `updateGiftcard` — stop writing `validationState` on amount mismatch
- `acceptExtractedAmount` — stop writing `validationState` and `extractedAmount`
- `keepDeclaredAmount` — stop writing `validationState`
- `confirmFuzzyMatch` — stop writing `validationState`
- `setCardValidationResult` — stop writing legacy flat fields
- `skipCardEvidence` — stop writing legacy flat fields
- `resetValidation` — stop writing legacy flat fields

---

## Spec 4: Proactive Duplicate Check

### Requirement

Users must be able to check if their claim codes already exist in the system BEFORE attempting to publish. The check is BLOCKING — codes that already exist cannot be published.

### Scenarios

**Scenario 1: New checkDuplicates server action**

- GIVEN a list of claim codes
- WHEN `checkDuplicates` is called
- THEN it normalizes each code, hashes it, and queries the database
- AND it returns an array of codes that already exist
- AND it uses the same normalization and hashing logic as `publishBatch`

**Scenario 2: Duplicate check in DetailsStep (manual path)**

- GIVEN the user has entered claim codes in the DetailsStep
- WHEN they click "Continuar" to go to Proof Upload
- THEN `checkDuplicates` is called with all claim codes
- AND if duplicates are found, they are displayed in an alert
- AND the user cannot proceed until duplicates are removed from the batch

**Scenario 3: Duplicate check in ReviewStep**

- GIVEN the user is on the ReviewStep
- WHEN they click "Publicar Lote"
- THEN `checkDuplicates` is called first (as a pre-flight check)
- AND if duplicates are found, the publish is blocked and duplicates are shown
- AND the user must go back and remove duplicates before publishing

**Scenario 4: No duplicates**

- GIVEN the user has entered unique claim codes
- WHEN `checkDuplicates` is called
- THEN it returns an empty array
- AND the user can proceed normally

### Technical constraints

- Extract the duplicate-check logic from `publishBatch` middleware into a shared utility function
- The new `checkDuplicates` action uses the same `normalizeClaimCode` and `hashCode` functions
- The action is a separate server action, not part of `publishBatch`

---

## Spec 5: Spanish Labels in DetailsStep

### Requirement

All user-facing labels in `DetailsStep` must be in Spanish (Rioplatense), consistent with the rest of the sellFlow.

### Labels to change

| Current (English)                              | New (Spanish)                                              |
| ---------------------------------------------- | ---------------------------------------------------------- |
| "Batch Actions"                                | "Acciones del lote"                                        |
| "Manage your gift cards."                      | "Gestioná tus tarjetas."                                   |
| "Cards"                                        | "Tarjetas"                                                 |
| "Add Card"                                     | "Agregar tarjeta"                                          |
| "Bulk Import"                                  | "Importar en lote"                                         |
| "Bulk"                                         | "Importar"                                                 |
| "Total Cards"                                  | "Total tarjetas"                                           |
| "Back"                                         | "Volver"                                                   |
| "Continue"                                     | "Continuar"                                                |
| "Gift Card Details"                            | "Datos de tarjetas"                                        |
| "Pending fields"                               | "Campos pendientes"                                        |
| "Amount"                                       | "Monto"                                                    |
| "PIN"                                          | "PIN" (keep)                                               |
| "Claim Code"                                   | "Código"                                                   |
| "Enter code"                                   | "Ingresá el código"                                        |
| "Optional"                                     | "Opcional"                                                 |
| "No cards added yet"                           | "No hay tarjetas"                                          |
| "Add cards manually or use the bulk importer." | "Agregá tarjetas manualmente o usá el importador en lote." |
