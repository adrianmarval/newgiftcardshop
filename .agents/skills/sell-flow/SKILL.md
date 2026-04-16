---
name: sell-flow
displayName: Sell Flow
description: Sistema de venta de gift cards. Incluye flujo de 3 pasos (Config, Intake, Review), validación OCR, fuzzy matching, estados de validación, bulk import con deduplicación. Úsese al trabajar en el sistema de venta de gift cards, componentes de intake, validación o acciones de seller.
version: 1.0.0
---

# Sell Flow - Sistema de Venta de Gift Cards

Sistema completo para que sellers carguen gift cards y las publiquen en lote. Maneja carga manual, bulk import, y extracción OCR con validación de evidencia.

## Overview del Sistema

El sell flow es un wizard de 3 pasos dónde el seller:

1. **Config**: Selecciona marca y país
2. **Intake**: Carga las tarjetas (manual, bulk, u OCR)
3. **Review**: Revisa el lote y publica

---

## Flujo Paso a Paso

### Step 1: BrandStep (Configuración)

- `src/components/sell/steps/brand-step.tsx`
- Seller selecciona país y marca
- Ambos campos son requeridos para continuar
- Validación: Solo continúa si `selectedBrand && selectedCountry`

### Step 2: IntakeStep (Carga de Tarjetas)

- `src/components/sell/steps/intake-step.tsx`
- Múltiples métodos de carga:
  - **Bulk import**: Pegar códigos en texto (formato: `CODE MONTO` por línea)
  - **OCR**: Subir imágenes de capturas y extraer códigos/montos con AI
  - **Manual**: Ingresar código y monto manualmente

### Step 3: ReviewStep (Revisión y Publicación)

- `src/components/sell/steps/review-step.tsx`
- Muestra resumen del lote
- Calcula total y payout estimado
- Botón para publicar

### Publicación

- `src/actions/seller-actions.ts` - `publishBatch`
- Validaciones server-side
- Deduplicación contra base de datos
- Transacción atómica para crear batch + giftcards

---

## Estados de Validación

Definidos en `src/types/sell/validation.ts`:

| Estado              | Significado        | Bloquea Progreso? | Descripción                                    |
| ------------------- | ------------------ | ----------------- | ---------------------------------------------- |
| `verified`          | Verificado         | ❌ No             | OCR encontró código y monto exacto             |
| `amount_not_found`  | Monto no detectado | ✅ Sí             | OCR detectó código pero no el monto            |
| `amount_mismatch`   | Monto diferente    | ✅ Sí             | Monto declarado ≠ monto extraído               |
| `fuzzy_match`       | Código similar     | ✅ Sí             | OCR encontró código a distancia ≤2 Levenshtein |
| `no_capture`        | Sin captura        | ❌ No             | No hay screenshot (aceptado)                   |
| `skipped`           | Omitido            | ❌ No             | Seller eligió omitir evidencia                 |
| `capture_mismatch`  | Captura incorrecta | ✅ Sí             | Error en procesamiento                         |
| `processing_error`  | Error              | ✅ Sí             | Falló el procesamiento                         |
| `code_new_detected` | DEPRECATED         | ❌ No             | Mantenido por compatibilidad                   |

### Estados que Bloquean Progreso

`BLOCKING_EVIDENCE_STATES` en `src/types/sell/validation.ts:39-45`:

```typescript
const BLOCKING_EVIDENCE_STATES = ['amount_mismatch', 'capture_mismatch', 'processing_error', 'fuzzy_match', 'amount_not_found'] as const;
```

### Función Bloqueante

```typescript
// src/types/sell/validation.ts
export function isBlockingEvidenceState(state: ValidationState | undefined): boolean {
  if (!state) return false;
  return BLOCKING_EVIDENCE_STATES.includes(state);
}
```

---

## Escenarios de OCR y Cómo se Manejan

### Lógica Principal: ingestOCRDraft

- Ubicación: `src/hooks/use-sell-flow.ts`, líneas 246-331
- Función que procesa tarjetas extraídas por OCR y las integra con las existentes

### Matriz de Escenarios

| #   | Escenario                                 | Entrada Inicial                      | Entrada OCR                      | Resultado          | Manejo                                         |
| --- | ----------------------------------------- | ------------------------------------ | -------------------------------- | ------------------ | ---------------------------------------------- |
| 1   | OCR detecta code + monto exacto           | -                                    | code: "ABC123", amount: "50.00"  | `verified`         | Match exacto → verified                        |
| 2   | OCR detecta code sin monto                | -                                    | code: "ABC123", amount: null     | `amount_not_found` | Bloquea hasta resolver                         |
| 3   | OCR detecta code + monto diferente        | -                                    | code: "ABC123", amount: "25.00"  | `amount_mismatch`  | Bloquea, muestra opciones                      |
| 4   | OCR fuzzy match (código similar)          | claimCode: "ABC123"                  | code: "ABC124", amount: "50.00"  | `fuzzy_match`      | Bloquea, confirmar/rechazar                    |
| 5   | Manual + OCR mismo code + mismo monto     | amount: "50.00"                      | code: "ABC123", amount: "50.00"  | `verified`         | Actualiza evidencia                            |
| 6   | Manual + OCR mismo code + monto diferente | amount: "50.00"                      | code: "ABC123", amount: "25.00"  | `amount_mismatch`  | Bloquea, resuelto: mantener o aceptar extraído |
| 7   | Manual con monto + OCR no detecta monto   | amount: "50.00"                      | code: "ABC123", amount: null     | `verified`         | Se confía en monto del usuario                 |
| 8   | Manual sin evidencia                      | amount: "50.00", claimCode: "ABC123" | (ninguna)                        | `no_capture`       | Aceptado                                       |
| 9   | OCR detecta code nuevo                    | -                                    | code: "XYZ999", amount: "100.00" | `verified`         | Nueva tarjeta creada                           |
| 10  | Fuzzy + confirma match                    | `fuzzy_match`                        | confirmFuzzyMatch()              | `verified`         | Confirma, mantiene código originale            |
| 11  | Fuzzy + rechaza match                     | `fuzzy_match`                        | rejectFuzzyMatch()               | `verified`         | Crea NUEVA tarjeta con código del OCR          |

---

## Bulk Import y Deduplicación

### Parsing de Códigos

- `src/lib/utils/claim-code-parser.ts` - `parseClaimCodes()`
- Formato esperado: `CODIGO MONTO` (uno por línea)
- Soporta 12, 14, o 15 caracteres (formatos Amazon)

### Normalización de Códigos

```typescript
// src/lib/utils/claim-code-parser.ts
export function normalizeClaimCode(input: string): string | null {
  const stripped = input.toUpperCase().replace(/[ -]/g, '');
  if (!/^[A-Z0-9]+$/.test(stripped)) return null;
  if (stripped.length !== 12 && stripped.length !== 14 && stripped.length !== 15) return null;
  return stripped;
}
```

### Deduplicación en HandleBulkImport

- `src/hooks/use-sell-flow.ts:196-243`
- Líneas 207-222: Build set de normalized keys + filtering
- Primera ocurrencia gana
- Duplicados dentro del mismo paste se descartan silenciosamente

### Deduplicación en Server (publishBatch)

- `src/actions/seller-actions.ts:30-55`
- Deduplicación intra-request
- Deduplicación contra base de datos existente

---

## Resolución de Conflictos

### amount_mismatch

Opciones mostradas al usuario:

- **"Keep typed amount"**: Mantiene monto declarado por usuario → `verified`
- **"Use screenshot amount"**: Usa monto extraído → `verified`
- **"Remove card"**: Elimina la tarjeta del lote

### fuzzy_match

Opciones:

- **"Yes, it's the same code"**: Confirma match → `verified`, mantiene código original
- **"No, keep both codes"**: Rechaza match → crea NUEVA tarjeta con código extraído

### amount_not_found

El usuario debe:

- Ingresar el monto manualmente → luego se marca como `verified`
- O eliminar la tarjeta

---

## Comportamientos Importantes

###Publish Sin Evidencia ES Permitido

- El sistema permite publicar lotes sin screenshots de evidencia
- Estados `no_capture` y `skipped` NO bloquean el flujo
- Esta es una decisión de negocio intencional

### fuzzyMatching

- Usa distancia Levenshtein con threshold ≤1
- Solo considera candidatos con monto matching también
- Línea 33-73 en `use-sell-flow.ts`: `getFuzzyCandidate()`

### Edición de Monto Post-OCR

- Si usuario edita el monto de una tarjeta была procesada por OCR
- El sistema detecta si el nuevo monto ≠ monto extraído
- Cambia estado a `amount_mismatch` (líneas 168-189)

### Eliminación de Tarjeta

- Si se elimina una tarjeta que tiene imagen asociada
- La imagen también se elimina del store
- Líneas 136-141 en `use-sell-flow.ts`

### Undo Remove

- El sistema guarda `lastRemovedCard` con índice original
- Permite deshacer eliminación antes de otra acción
- Líneas 145-152

---

## Code References

### Hook Principal (Zustand Store)

```
src/hooks/use-sell-flow.ts
├── parseAmount() - líneas 21-25
├── formatAmount() - líneas 27-31
├── getFuzzyCandidate() - líneas 33-73
├── ingestOCRDraft() - líneas 246-331
├── handleBulkImport() - líneas 196-243
├── acceptExtractedAmount() - líneas 334-348
├── keepDeclaredAmount() - líneas 350-360
├── confirmFuzzyMatch() - líneas 362-372
├── rejectFuzzyMatch() - líneas 374-413
├── resolveAmountMismatch() - líneas 415-423
└── removeGiftcard() - líneas 132-143
```

### Componentes del Wizard

```
src/components/sell/
├── sell-batch-manager.tsx    # Wizard principal, orchestration
├── steps/
│   ├── brand-step.tsx        # Step 1: Config país+marca
│   ├── intake-step.tsx        # Step 2: Carga y resolución
│   └── review-step.tsx        # Step 3: Review y publish
├── bulk-paste-dialog.tsx     # Dialog para bulk import
└── image-dropzone.tsx        # Upload de imágenes
```

### Acciones Server

```
src/actions/seller-actions.ts
├── publishBatch() - líneas 15-145  # Validación + persistencia
├── getSellerBatches() - líneas 147-226
└── getSellerRate() - líneas 228-237
```

### Tipos y Utilidades

```
src/types/sell/validation.ts          # Estados y validación
src/types/giftcard/giftcard.ts       # Tipos de giftcard
src/lib/utils/claim-code-parser.ts  # Normalización
```

---

## Tipos Principales

### SellFlowGiftcard

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

### SellFlowCardEvidence

```typescript
interface SellFlowCardEvidence {
  status: ValidationState;
  matchedImageId?: string;
  extractedCode?: string;
  extractedAmount?: string;
  fuzzyConfirmed?: boolean;
  amountDecision?: 'accept-extracted' | 'keep-declared';
}
```

### SellFlowImage

```typescript
interface SellFlowImage {
  id: string;
  compressedData: string;
  previewUrl: string;
}
```

---

## Validaciones de Negocio

| Regla                | Ubicación                        | Comportamiento                         |
| -------------------- | -------------------------------- | -------------------------------------- |
| Monto > 0            | Server (seller-actions.ts:21-23) | Rechaza si ≤0 o NaN                    |
| Código no vacío      | Server                           | Rechaza claimCode vacío                |
| claimCode válido     | `normalizeClaimCode()`           | Solo 12/14/15 caracteres alfanuméricos |
| Dedupe server        | `publishBatch`                   | Intra-request + contra BD              |
| sellRate del usuario | `publishBatch:89`                | Se得到 del usuario logueado            |

---

## Notas para Desarrollo

1. **Legacy Fields**: El código mantiene `validationState`, `extractedCode`, `extractedAmount`, `matchedImageId` como campos flat además del objeto `evidence` para compatibilidad. Ambosen sincronización.

2. ** fuente de Tarjeta (`source`)**: Indica cómo fue creada la tarjeta:
   - `manual`: Usuario escribió a mano
   - `ocr`: Extraída por OCR
   - `bulk`:Importada desde texto

3. **Imágenes No Se Reusan**: Si una imagen já fue asociada a una tarjeta, puede volverse a associate (en fuzzy reject crea nuevo card). Esto es comportamientoby diseño.

4. **Estados Deprecated**: `code_new_detected` está marcado `@deprecated` pero se mantiene para compatibilidad con datos legacy.
