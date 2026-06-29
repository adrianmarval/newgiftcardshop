// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp — Baileys status types
// ─────────────────────────────────────────────────────────────────────────────

export interface WhatsAppStatus {
  status: string;
  phoneNumber: string | null;
}

export interface WhatsAppFullStatus extends WhatsAppStatus {
  qr: string | null;
}