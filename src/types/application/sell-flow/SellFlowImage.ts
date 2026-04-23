// ─────────────────────────────────────────────────────────────────────────────
// Sell Flow — Imagen en el wizard de venta
// Imagen subida esperando validación AI o ingestion OCR.
// NO está encriptada — la encriptación ocurre solo en publishBatch.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Imagen subida esperando validación AI o ingestión OCR.
 * NO está encriptada — la encriptación ocurre solo en publishBatch.
 * Almacena JPEG comprimido como base64 para enviar a AI vision,
 * y una object URL local para el thumbnail preview.
 */
export interface SellFlowImage {
  id: string;
  /** JPEG comprimido como base64 — enviado directo a AI vision, encriptado solo en publish */
  compressedData: string;
  /** Object URL local para thumbnail preview (URL.createObjectURL). Temporal, no persistir. */
  previewUrl: string;
}
