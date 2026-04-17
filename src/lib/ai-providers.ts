// lib/ai-providers.ts

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ImagePart {
  type: 'image_url';
  image_url: {
    url: string; // Can be real URL or data:image/...;base64,...
  };
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<TextPart | ImagePart>;
}

export interface AIResponse {
  text: string;
}

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  /** Optional app name/URL for provider headers (e.g. OpenRouter requires HTTP-Referer) */
  appName?: string;
  appUrl?: string;
}

export interface AIProvider {
  complete(messages: AIMessage[], system?: string, jsonMode?: boolean): Promise<AIResponse>;
}

// ─── Anthropic ────────────────────────────────────────────────────────────────
export function createAnthropicProvider(config: AIProviderConfig): AIProvider {
  return {
    async complete(messages, system, jsonMode) {
      // Convert vision messages to Anthropic format
      const anthropicMessages = messages.map((m) => {
        if (typeof m.content === 'string') {
          return m;
        }
        // Convert array content (vision) to Anthropic format
        const content = m.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text };
          }
          if (part.type === 'image_url') {
            const url = part.image_url.url;
            if (url.startsWith('data:image/')) {
              const match = url.match(/data:image\/(\w+);base64,(.+)/);
              if (match) {
                return {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: `image/${match[1]}`,
                    data: match[2],
                  },
                };
              }
            }
            // For non-base64 URLs, we'd need to fetch the image first
            // For now, return as text fallback
            return { type: 'text', text: `[Image: ${url}]` };
          }
          return { type: 'text', text: '' };
        });
        return { role: m.role, content };
      });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 1024,
          system,
          messages: anthropicMessages,
        }),
      });
      if (!response.ok) throw new Error(`Anthropic error: ${response.status}`);
      const data = await response.json();
      return { text: data.content?.map((c: any) => c.text || '').join('') || '' };
    },
  };
}

// ─── OpenAI / OpenRouter (compatible) ────────────────────────────────────────
export function createOpenAICompatibleProvider(config: AIProviderConfig): AIProvider {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const isOpenRouter = baseUrl.includes('openrouter.ai');
  return {
    async complete(messages, system, jsonMode) {
      // When content is a string, wrap in standard message format
      // When content is an array (vision), pass through as-is
      const allMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey || ''}`,
      };
      // OpenRouter requires HTTP-Referer and recommends X-Title
      if (isOpenRouter) {
        headers['HTTP-Referer'] = config.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        headers['X-Title'] = config.appName || 'NewGiftCardShop';
      }
      const body: any = { model: config.model, messages: allMessages };
      if (jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`OpenAI-compatible error: ${response.status} — ${errorBody}`);
      }
      const data = await response.json();
      return { text: data.choices?.[0]?.message?.content || '' };
    },
  };
}

// ─── Gemini ───────────────────────────────────────────────────────────────────
export function createGeminiProvider(config: AIProviderConfig): AIProvider {
  return {
    async complete(messages, system, jsonMode) {
      const contents = messages.map((m) => {
        if (typeof m.content === 'string') {
          return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          };
        }
        // Convert vision content array to Gemini format
        const parts = m.content.map((part) => {
          if (part.type === 'text') {
            return { text: part.text };
          }
          if (part.type === 'image_url') {
            const url = part.image_url.url;
            if (url.startsWith('data:image/')) {
              const match = url.match(/data:image\/(\w+);base64,(.+)/);
              if (match) {
                return {
                  inline_data: {
                    mime_type: `image/${match[1]}`,
                    data: match[2],
                  },
                };
              }
            }
            // For non-base64 URLs, return as text fallback
            return { text: `[Image: ${url}]` };
          }
          return { text: '' };
        });
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts,
        };
      });
      const body: any = { contents };
      if (system) {
        body.systemInstruction = { parts: [{ text: system }] };
      }
      if (jsonMode) {
        body.generationConfig = { responseMimeType: 'application/json' };
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
      const data = await response.json();
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
    },
  };
}

// ─── Ollama (local) ───────────────────────────────────────────────────────────
export function createOllamaProvider(config: AIProviderConfig): AIProvider {
  const baseUrl = config.baseUrl || 'http://localhost:11434';
  return {
    async complete(messages, system, jsonMode) {
      const allMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const body: any = { model: config.model, messages: allMessages, stream: false };
      if (jsonMode) {
        body.format = 'json';
      }

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      return { text: data.message?.content || '' };
    },
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────
export type ProviderName = 'anthropic' | 'openai' | 'openrouter' | 'gemini' | 'ollama' | 'opencodego';

export function createProvider(name: ProviderName, config: AIProviderConfig): AIProvider {
  switch (name) {
    case 'anthropic':
      return createAnthropicProvider(config);
    case 'openai':
      return createOpenAICompatibleProvider(config);
    case 'openrouter':
      return createOpenAICompatibleProvider({
        ...config,
        baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1',
      });
    case 'opencodego':
      return createOpenAICompatibleProvider({
        ...config,
        baseUrl: config.baseUrl || 'https://opencode.ai/zen/go/v1',
      });
    case 'gemini':
      return createGeminiProvider(config);
    case 'ollama':
      return createOllamaProvider(config);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
