import OpenAI from 'openai';
import { getActiveProvider, type AIProviderConfigFull } from '@/lib/ai-provider-config';
import { logger } from '@/lib/logger';

export interface ExtractionResult {
  claimCode: string | null;
  amount: string | null;
}

const VISION_SYSTEM_PROMPT = `You are an expert at reading gift card screenshots.
Look at the provided image carefully and extract ONLY the gift card claim code and monetary amount.

A claim code is always 14 or 15 alphanumeric characters, typically formatted like XXXX-XXXXXX-XXXX or XXXX-XXXXXX-XXXXX.

CRITICAL: If you cannot find a valid claim code, return null for both fields.
Do not guess or extract irrelevant numbers like tracking IDs, phone numbers, or order numbers.

You MUST call the extract_giftcard function with the extracted data.`;

const VISION_USER_PROMPT = `Extract the gift card claim code and amount from this image.`;

const EXTRACT_TOOL: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'extract_giftcard',
    description: 'Extract gift card claim code and amount from a screenshot',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        claimCode: {
          type: ['string', 'null'],
          description: 'The 14-15 alphanumeric claim code, or null if not found',
        },
        amount: {
          type: ['string', 'null'],
          description: 'The monetary amount as a string with decimals, or null if not found',
        },
      },
      required: ['claimCode', 'amount'],
      additionalProperties: false,
    },
  },
};

function createClient(provider: AIProviderConfigFull): OpenAI {
  return new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl || undefined,
  });
}

function extractFromToolCall(response: OpenAI.ChatCompletion): ExtractionResult {
  const message = response.choices[0]?.message;

  // Standard tool call
  const toolCall = message?.tool_calls?.[0];
  if (toolCall && 'function' in toolCall && toolCall.type === 'function') {
    const args = JSON.parse(toolCall.function.arguments);
    return { claimCode: args.claimCode || null, amount: args.amount || null };
  }

  // Fallback: parse content (some models embed JSON in content)
  const raw = message?.content || '';
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return { claimCode: parsed.claimCode || parsed.claim_code || null, amount: parsed.amount || null };
}

export async function extractGiftCardData(imageBase64: string, mimeType: string): Promise<ExtractionResult> {
  const provider = await getActiveProvider();
  if (!provider) {
    throw new Error('No active AI provider configured. Configure one in Admin > Platform > AI Vision Provider.');
  }

  const client = createClient(provider);
  const imageUrl = `data:${mimeType};base64,${imageBase64}`;

  const maxAttempts = 3;
  let lastError: any;
  const imgId = imageBase64.slice(-10);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt === 1) {
        logger.info(`[AI-VISION] Iniciando extracción modelo ${provider.model}`, {
          flow: 'sell',
          action: 'ocr-extract',
          metadata: { imgId, model: provider.model, provider: provider.name },
        });
      } else {
        logger.info(`[AI-VISION] Reintento ${attempt}/${maxAttempts}`, {
          flow: 'sell',
          action: 'ocr-extract',
          metadata: { imgId, attempt },
        });
      }

      const response = await client.chat.completions.create({
        model: provider.model,
        messages: [
          { role: 'system', content: VISION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: VISION_USER_PROMPT },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [EXTRACT_TOOL],
        tool_choice: { type: 'function', function: { name: 'extract_giftcard' } },
        thinking: { type: 'disabled' },
      } as any);

      logger.debug('[AI-VISION] Respuesta recibida', {
        flow: 'sell',
        action: 'ocr-extract',
        metadata: { imgId },
      });

      const result = extractFromToolCall(response);

      if (!result.claimCode && attempt < maxAttempts) {
        throw new Error('AI returned empty claimCode (Null-Retry triggered)');
      }

      logger.info('[AI-VISION] Extracción exitosa', {
        flow: 'sell',
        action: 'ocr-extract',
        metadata: { imgId, hasClaimCode: !!result.claimCode },
      });
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(`[AI-VISION] Intento ${attempt} falló, reintentando en ${delay}ms`, {
          flow: 'sell',
          action: 'ocr-extract',
          metadata: { imgId, attempt, delay },
          error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : 'Unknown' },
        });
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      logger.error(`[AI-VISION] Fallo definitivo después de ${maxAttempts} intentos`, {
        flow: 'sell',
        action: 'ocr-extract',
        metadata: { imgId, maxAttempts },
        error: { name: err instanceof Error ? err.name : 'Error', message: err instanceof Error ? err.message : 'Unknown' },
      });
    }
  }

  throw lastError || new Error('Extraction failed after retries');
}
