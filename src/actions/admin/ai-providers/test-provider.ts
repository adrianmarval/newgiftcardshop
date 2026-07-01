'use server';

import OpenAI from 'openai';
import { adminActionClient } from '@/lib/safe-action';
import { getProviderById } from '@/lib/ai-provider-config';
import { z } from 'zod';

const testProviderSchema = z.object({
  id: z.string().cuid(),
});

const TEST_TOOL: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'respond_ok',
    description: 'Respond with status ok',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          const: 'ok',
        },
      },
      required: ['status'],
      additionalProperties: false,
    },
  },
};

export const testAIProvider = adminActionClient
  .inputSchema(testProviderSchema)
  .action(async ({ parsedInput: { id } }) => {
    const provider = await getProviderById(id);
    if (!provider) throw new Error('Provider not found');

    const client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl || undefined,
    });

    const response = await client.chat.completions.create({
      model: provider.model,
      messages: [
        { role: 'user', content: 'Call the respond_ok function.' },
      ],
      tools: [TEST_TOOL],
      tool_choice: { type: 'function', function: { name: 'respond_ok' } },
      max_tokens: 64,
      thinking: { type: 'disabled' },
    } as any);

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    const args = toolCall && 'function' in toolCall && toolCall.type === 'function'
      ? toolCall.function.arguments
      : '{}';
    const parsed = JSON.parse(args);

    return { success: true, model: provider.model, response: parsed };
  });
