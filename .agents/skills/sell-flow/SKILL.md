---
name: sell-flow
displayName: Sell Flow
description: Sistema de venta de gift cards. Flujo de 3 pasos (Config, DataEntry, Review), OCR, bulk import con deduplicación, publicación via server action. Úsese al trabajar en el sistema de venta de gift cards, componentes de intake, validación o acciones de seller.
version: 2.0.0
---

# Sell Flow - Sistema de Venta de Gift Cards

Sistema completo para que sellers carguen gift cards y las publiquen en lote. Maneja carga manual, bulk import, y extracción OCR.

## Overview del Sistema

El sell flow es un wizard de 3 pasos:

1. **Config** (`brand-step.tsx`): Selecciona marca y país
2. **DataEntry** (`data-entry-step.tsx`): Carga las tarjetas (paste de códigos + OCR opcional)
3. **Review** (`review-step.tsx`): Revisa el lote y publica

---

## Archivos reales (NO los del header del parser)

```
src/hooks/use-sell-flow.ts          # Zustand store (sin persist)
src/components/sell/
├── sell-flow-manager.tsx           # Orchestrator del wizard
├── steps/
│   ├── brand-step.tsx              # Step 1: Config
│   ├── data-entry-step.tsx         # Step 2: Carga (textarea inline + dropzone inline)
│   └── review-step.tsx             # Step 3: Review
src/actions/seller/batches/
├── publish-batch.ts                # Server action principal
├── check-codes.ts                  # Check duplicados contra DB
├── list-batches.ts                 # Listar batches del seller
└── get-seller-rate.ts              # Obtener sellRate
src/actions/buyer/giftcards/ocr/    # NOTA: actions de OCR viven aquí pero usan sellerActionClient
├── upload-image.ts
└── extract-draft.ts
src/lib/utils/claim-code-parser.ts  # Parser (compartido bot+web)
src/types/domain/giftcard.ts        # Tipos de dominio
```

**NOTA:** `sell-batch-manager.tsx`, `intake-step.tsx`, `image-dropzone.tsx`, `seller-actions.ts`, `types/sell/validation.ts` **NO EXISTEN**. Los nombres reales son los de arriba.

---

## Parser de Códigos

- `src/lib/utils/claim-code-parser.ts` — `parseClaimCodes()`
- Formato: `CODE AMOUNT [PIN]` (uno por línea)
- **Acepta coma decimal**: `25,50` → `25.50`, `1.000` → `1000`
- Claim codes: **14 o 15 chars** alfanuméricos (NO 12 — el header del parser dice 12 pero el código rechaza 12)
- Normalización: uppercase + strip spaces/hyphens → canonical format `4-6-4` (14) o `4-6-5` (15)
- Dedup intra-paste: primera ocurrencia gana, duplicados silenciosamente descartados

```typescript
export function normalizeClaimCode(input: string): string | null {
  const stripped = input.toUpperCase().replace(/[ -]/g, '');
  if (!/^[A-Z0-9]+$/.test(stripped)) return null;
  if (stripped.length !== 14 && stripped.length !== 15) return null;  // NO 12
  return stripped;
}
```

**INCONSISTENCIA:** `src/types/domain/giftcard.ts:58-63` tiene un `normalizeClaimCode` DUPLICADO que acepta 12 chars. Ese está sin uso. El que se usa es el del parser.

---

## Deduplicación

### En el parser (intra-paste)
- `seen` Set de normalized keys
- Primera ocurrencia gana
- Duplicados descartados silenciosamente

### En check-codes (contra DB)
- `src/actions/seller/batches/check-codes.ts`
- Query por `codeHash` **GLOBAL** (sin filtro `brandCountryId` — fix aplicado)
- Retorna claim codes descifrados (deuda: debería retornar solo booleanos/hashes)

### En publish-batch (server action)
- `src/actions/seller/batches/publish-batch.ts`
- **Doble check**: `useValidated` (línea 76) + re-check en `.action` (línea 112)
- Ambos checks son **globales** (sin `brandCountryId`)
- `useValidated` throws si hay cualquier duplicado → all-or-nothing
- El re-check del `.action` recolecta `duplicates[]` y filtra → partial publish
- **TOCTOU**: los checks están fuera de la `$transaction` (deuda)

---

## Publicación

### Web (`publish-batch.ts`)
- Server action con `sellerActionClient` (autorización por rol)
- Zod schema: `cards[]`, `brandId`, `countryId`, `unmatchedImages[]`
- Validación: `amount > 0`, `claimCode` no vacío. **NO** valida formato de claimCode ni minAmount/maxAmount (deuda)
- Si `normalizeClaimCode` retorna null → **fallback a raw uppercased** (deuda: debería rechazar)
- Transacción atómica: crea batch + giftcards + provenanceImages
- Imágenes: cifradas con `encryptBuffer` (AES-256-GCM)
- `codeHash @unique` global es la última línea de defensa

### Bot (`sell.handler.ts`)
- **NO usa `publish-batch.ts`** — re-implementa inline (deuda: divergencia con web)
- Diferencias con web:
  - Duplicados: partial publish (filtra) vs web all-or-nothing (throw)
  - Imágenes: solo `telegramFileId` vs web cifrada
  - No re-normaliza claimCode (confía en el parser)
  - No valida amount server-side

---

## OCR (Data Entry)

- `src/actions/buyer/giftcards/ocr/upload-image.ts` — sube y comprime (usa `sellerActionClient`)
- `src/actions/buyer/giftcards/ocr/extract-draft.ts` — llama a AI vision (Gemini/OpenRouter)
- `src/lib/giftcard-vision.ts` — wrapper del provider de AI
- `src/lib/image-utils.ts` — `compressImage()` con sharp (max 1024px, quality 0.8)
- Chunks de 10 imágenes, sin cap total (deuda: DoS/costo)
- 3 retries con backoff 2s/4s

**DEUDA CRÍTICA:** `addImageToCard` en `use-sell-flow.ts:336` es **no-op**. La feature de "adjuntar screenshot a una card en Review" no funciona. Sube la imagen, corre OCR, muestra toast verde, pero no hace nada.

---

## Estados de Validación

NO existe `fuzzyMatch` (Levenshtein). NO existe `undo-remove`. El matching es exacto (normalized string equality).

El store tiene `validationState` pero los estados que se usan en la práctica son simples (verified, no_capture, skipped). Los estados complejos del tipo `amount_mismatch`, `fuzzy_match` existen en el tipo pero no se alcanzan en el flujo actual.

---

## Tipos principales

### SellFlowGiftcard (del store Zustand)

```typescript
interface SellFlowGiftcard {
  id: string;
  amount: string;
  claimCode: string;
  pinCode: string;
  source: 'manual' | 'ocr' | 'bulk';
  evidence?: SellFlowCardEvidence;
  validationState: ValidationState;
  extractedCode?: string;
  extractedAmount?: string;
  matchedImageId?: string;
}
```

### ParsedGiftcard (del parser)

```typescript
interface ParsedGiftcard {
  claimCode: string;  // canonical format
  amount: string;     // string, comma normalized to dot
  pinCode?: string;
  line: number;       // línea original del paste
}
```

---

## Problemas conocidos (P2 — no urgente)

| Problema | Archivo | Descripción |
|----------|---------|-------------|
| `addImageToCard` no-op | `use-sell-flow.ts:336` | Feature de evidencia en Review completamente rota |
| Sin validación server de claimCode | `publish-batch.ts:55-61` | Fallback a raw uppercased si normalizeClaimCode falla |
| Sin validación de minAmount/maxAmount | `publish-batch.ts:42-45` | BrandCountry limits nunca se chequean |
| Back navigation destruye batch | `data-entry-step.tsx:433-437` | useEffect wipe en mount |
| Sin persist | `use-sell-flow.ts:149` | Refresh = pérdida total |
| Blob URL leaks | `use-sell-flow.ts:326,164,332,338` | Nunca se revocan |
| `console.table` con claim codes | `data-entry-step.tsx:157,160` | Secretos en consola |
| Doble `normalizeClaimCode` | `claim-code-parser.ts` vs `types/domain/giftcard.ts` | Criterios distintos (12 vs 14/15) |
| TOCTOU en dedup | `publish-batch.ts:76-86,112-116` | Checks fuera de la tx |
