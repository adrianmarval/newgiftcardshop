import { createProvider, type AIProvider, type ProviderName, type AIProviderConfig } from '@/lib/ai-providers';

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

export function buildVisionProvider(): AIProvider {
  const providerName = (process.env.PROVENANCE_PROVIDER || 'openrouter') as ProviderName;
  const model = process.env.PROVENANCE_MODEL || 'google/gemini-2.0-flash-001';

  const config: AIProviderConfig = {
    apiKey: process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY,
    model,
  };

  return createProvider(providerName, config);
}

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

  const maxAttempts = 3;
  let lastError: any;
  const imgId = imageBase64.slice(-10);
  const modelName = (provider as any).model || 'default';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt === 1) {
        console.log(`[AI-VISION] [${imgId}] Starting extraction using model ${modelName}`);
      } else {
        console.log(`[AI-VISION] [${imgId}] 🔄 [RETRY ${attempt}/${maxAttempts}] Re-attempting extraction...`);
      }

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
        true,
      );

      console.log(`[AI-VISION] [${imgId}] Raw response:`, text);

      const parsed = JSON.parse(text);
      const claimCode = parsed.claim_code || null;

      if (!claimCode && attempt < maxAttempts) {
        throw new Error('AI returned empty claim_code (Null-Retry triggered)');
      }

      console.log(`[AI-VISION] [${imgId}] ✅ Extraction successful.`);
      return { claimCode, amount: parsed.amount || null };
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `[AI-VISION] [${imgId}]  Attempt ${attempt} failed: ${err instanceof Error ? err.message : 'Unknown error'}. Retrying in ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      console.error(`[AI-VISION] [${imgId}] ❌ Final failure after ${maxAttempts} attempts:`, err);
    }
  }

  throw lastError || new Error('Extraction failed after retries');
}
