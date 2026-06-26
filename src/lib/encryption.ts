import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_HEX_LENGTH = 64; // 32 bytes expressed as hex
const CURRENT_KEY_VERSION = 1;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (key.length !== KEY_HEX_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be exactly ${KEY_HEX_LENGTH} hex characters (32 bytes)`);
  }

  return Buffer.from(key, 'hex');
}

/**
 * Key versioning: new ciphertext is prefixed with `v1:`.
 * Legacy ciphertext (no prefix, 3 parts) is still readable.
 * To rotate keys: set KEY_VERSION=2 + new ENCRYPTION_KEY, old data decrypts with key v1.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  const authTag = cipher.getAuthTag();

  return `v${CURRENT_KEY_VERSION}:${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`;
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');

  let ivB64: string;
  let encryptedB64: string;
  let authTagB64: string;

  if (parts.length === 4 && parts[0].startsWith('v')) {
    // Versioned format: v1:iv:encrypted:authTag
    [, ivB64, encryptedB64, authTagB64] = parts;
  } else if (parts.length === 3) {
    // Legacy format (backward compatible): iv:encrypted:authTag
    [ivB64, encryptedB64, authTagB64] = parts;
  } else {
    throw new Error('Invalid ciphertext format — expected v1:base64(iv):base64(ciphertext):base64(authTag)');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Decryption failed — ciphertext may be corrupted or tampered');
  }
}

export function hashCode(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

// ─── Buffer-mode AES-256-GCM (for ProvenanceImage) ───────────────────────────

export interface EncryptedBuffer {
  data: Buffer; // IV (12 bytes) + authTag (16 bytes) + encrypted data
}

export function encryptBuffer(buffer: Buffer): EncryptedBuffer {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Format: IV (12 bytes) + authTag (16 bytes) + encrypted data
  const result = Buffer.concat([iv, authTag, encrypted]);

  return { data: result };
}

export function decryptBuffer(encryptedBuffer: Buffer): Buffer {
  const key = getEncryptionKey();

  // Minimum size: 12 (IV) + 16 (authTag) = 28 bytes
  if (encryptedBuffer.length < IV_BYTES + 16) {
    throw new Error('Invalid encrypted buffer — too short');
  }

  const iv = encryptedBuffer.subarray(0, IV_BYTES);
  const authTag = encryptedBuffer.subarray(IV_BYTES, IV_BYTES + 16);
  const encrypted = encryptedBuffer.subarray(IV_BYTES + 16);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted;
  } catch {
    throw new Error('Buffer decryption failed — ciphertext may be corrupted or tampered');
  }
}
