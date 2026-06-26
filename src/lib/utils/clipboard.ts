/**
 * Cross-context clipboard utility.
 *
 * navigator.clipboard requires a Secure Context (HTTPS or localhost).
 * When accessing via LAN IP (e.g. 192.168.x.x:3000) over HTTP,
 * the Clipboard API is undefined. This function falls back to the
 * legacy execCommand('copy') approach in non-secure contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Prefer modern API when available in secure contexts
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy method
    }
  }

  // Legacy fallback for non-secure contexts (HTTP over LAN, etc.)
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}
