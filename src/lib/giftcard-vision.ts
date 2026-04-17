// lib/giftcard-vision.ts
// Direct AI vision extraction for gift card provenance validation

import { createProvider, type AIProvider, type ProviderName, type AIProviderConfig } from './ai-providers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedClaimCode {
  formatted: string;
  raw: string;
  parts: string[];
  isLong: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface ExtractionResult {
  claimCode: string | null;
  amount: string | null;
}

export interface MatchResult {
  matched: boolean;
  exactMatch: boolean;
  fuzzyMatch: boolean;
  matchedCardId?: string; // cardId for fuzzy_match
  matchedCode?: string;
}

// ─── parseClaimCode ──────────────────────────────────────────────────────────

export function parseClaimCode(raw: string): ParsedClaimCode | null {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw
    .trim()
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  if (clean.length === 14) {
    const [p1, p2, p3] = [clean.slice(0, 4), clean.slice(4, 10), clean.slice(10, 14)];
    return { formatted: `${p1}-${p2}-${p3}`, raw: clean, parts: [p1, p2, p3], isLong: false, confidence: 'high' };
  }
  if (clean.length === 15) {
    const [p1, p2, p3] = [clean.slice(0, 4), clean.slice(4, 10), clean.slice(10, 15)];
    return { formatted: `${p1}-${p2}-${p3}`, raw: clean, parts: [p1, p2, p3], isLong: true, confidence: 'high' };
  }
  return null;
}

// ─── Levenshtein distance (inline, no library) ───────────────────────────────

export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

// ─── buildVisionProvider ─────────────────────────────────────────────────────

export function buildVisionProvider(): AIProvider {
  const providerName = (process.env.PROVENANCE_PROVIDER || 'openrouter') as ProviderName;
  const model = process.env.PROVENANCE_MODEL || 'google/gemini-2.5-flash-preview-03-25';

  const config: AIProviderConfig = {
    apiKey: process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY,
    model,
  };

  return createProvider(providerName, config);
}

// ─── extractGiftCardData ─────────────────────────────────────────────────────

/**
 * Brand-agnostic system prompt.
 * Accepts any gift card — Amazon, Google Play, iTunes, etc.
 * The claim code pattern (14–15 alphanumeric chars) is universal.
 */
const VISION_SYSTEM_PROMPT = `You are an expert at reading gift card screenshots.
Look at the provided image carefully and extract ONLY the gift card claim code and monetary amount.

A claim code is always 14 or 15 alphanumeric characters, typically formatted like XXXX-XXXXXX-XXXX or XXXX-XXXXXX-XXXXX.

CRITICAL: If you cannot find a valid claim code, return null for both fields.
Do not guess or extract irrelevant numbers like tracking IDs, phone numbers, or order numbers.
Always respond with valid JSON only.`;

const VISION_USER_PROMPT = `Extract the gift card claim code and amount from this image. Respond ONLY with: {"claim_code": "<code or null>", "amount": "<number with decimals or null>"}`;

export async function extractGiftCardData(imageBase64: string, mimeType: string): Promise<ExtractionResult> {
  const provider = buildVisionProvider();
  const imageUrl = `data:${mimeType};base64,${imageBase64}`;

  const { text } = await provider.complete(
    [
      {
        role: 'user',
        content: [
          { type: 'text', text: VISION_USER_PROMPT },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    VISION_SYSTEM_PROMPT,
    true // Enable JSON mode for structured output
  );

  try {
    const parsed = JSON.parse(text);
    return {
      claimCode: parsed.claim_code || null,
      amount: parsed.amount || null,
    };
  } catch (err) {
    console.error('Failed to parse (even with jsonMode):', text);
    return { claimCode: null, amount: null };
  }
}

// ─── matchClaimCode ───────────────────────────────────────────────────────────

export function matchClaimCode(
  extracted: string,
  cardClaimCode: string,
  allCardCodes: Array<{ id: string; claimCode: string }>,
): MatchResult {
  if (!extracted) {
    return { matched: false, exactMatch: false, fuzzyMatch: false };
  }

  const normalizedExtracted = extracted.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // Exact match against the primary card
  const primaryNormalized = cardClaimCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (normalizedExtracted === primaryNormalized) {
    return { matched: true, exactMatch: true, fuzzyMatch: false };
  }

  // Fuzzy match: Levenshtein distance ≤ 2 against all cards (including primary).
  // The exact-match short-circuit above already handles the primary card's happy path;
  // including it here allows a fuzzy_match result when OCR misses by 1–2 characters.
  for (const card of allCardCodes) {
    const normalizedCard = card.claimCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const distance = levenshtein(normalizedExtracted, normalizedCard);
    if (distance <= 2) {
      return {
        matched: true,
        exactMatch: false,
        fuzzyMatch: true,
        matchedCardId: card.id,
        matchedCode: card.claimCode,
      };
    }
  }

  return { matched: false, exactMatch: false, fuzzyMatch: false };
}
