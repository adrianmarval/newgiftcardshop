// ─────────────────────────────────────────────────────────────────────────────
// Telegram File Service — descarga de archivos via Bot API (getFile → download).
// Compartido por las actions admin que resuelven evidencia subida por los bots
// (batch provenance images via SELLER_BOT_TOKEN, issue proofs via BUYER_BOT_TOKEN).
// SERVER-ONLY: importar directo, NUNCA re-exportar en barrels client-safe.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Descarga un archivo de Telegram como base64. Devuelve null si falla
 * (file_id inválido, red, archivo expirado) — el caller decide el fallback.
 */
export async function downloadTelegramFileAsBase64(
  botToken: string,
  fileId: string,
): Promise<{ base64: string; filePath: string } | null> {
  try {
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();

    if (!fileData.ok) {
      console.error(`[TelegramFile] Error fetching file info for ID ${fileId}`);
      return null;
    }

    const filePath: string = fileData.result.file_path;
    const downloadRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    const buffer = Buffer.from(await downloadRes.arrayBuffer());

    return { base64: buffer.toString('base64'), filePath };
  } catch (err) {
    console.error('[TelegramFile] Error downloading telegram file:', err);
    return null;
  }
}
