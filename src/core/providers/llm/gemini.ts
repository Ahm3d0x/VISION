import { ILLMProvider, LLMMessage, LLMResponse, LLMToolCall, LLMToolDeclaration } from './types';

export const DEFAULT_GEMINI_KEY =
  (typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY)) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  '';
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

export interface GeminiProviderOptions {
  apiKey?: string;
  modelName?: string;
  temperature?: number;
}

export class GeminiProvider implements ILLMProvider {
  public readonly name = 'gemini';
  public readonly defaultModel = 'gemini-3.6-flash';

  private apiKey: string;
  private model: string;
  private temperature: number;

  constructor(options?: GeminiProviderOptions) {
    this.apiKey = options?.apiKey || DEFAULT_GEMINI_KEY;
    this.model = options?.modelName || this.defaultModel;
    this.temperature = options?.temperature ?? 0.4;
  }

  public setApiKey(key: string) {
    this.apiKey = key;
  }

  public setModel(model: string) {
    this.model = model;
  }

  public async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  public async chat(
    messages: LLMMessage[],
    tools?: LLMToolDeclaration[]
  ): Promise<LLMResponse> {
    const modelsToTry = [this.model, ...FALLBACK_MODELS.filter((m) => m !== this.model)];
    const systemMessage = messages.find((m) => m.role === 'system')?.content;
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Convert tools to Gemini format
    const geminiTools = tools && tools.length > 0 ? [
      {
        function_declarations: tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: {
            type: 'OBJECT',
            properties: Object.fromEntries(
              Object.entries(t.function.parameters.properties).map(([k, v]) => {
                const propType = v.type.toUpperCase();
                const prop: any = {
                  type: propType,
                  description: v.description,
                };
                if (v.enum) {
                  prop.enum = v.enum;
                }
                if (propType === 'ARRAY') {
                  prop.items = v.items
                    ? { type: (v.items.type || 'string').toUpperCase() }
                    : { type: 'STRING' };
                }
                return [k, prop];
              })
            ),
            required: t.function.parameters.required || [],
          },
        })),
      },
    ] : undefined;

    // Convert messages to Gemini format
    const contents = conversationMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    for (const currentModel of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${this.apiKey}`;
        const body: Record<string, any> = {
          contents,
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: 1200,
          },
        };

        if (systemMessage) {
          body.system_instruction = { parts: [{ text: systemMessage }] };
        }

        if (geminiTools) {
          body.tools = geminiTools;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(body),
        });

        if (response.status === 429) {
          continue;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gemini API Error: Status ${response.status}`);
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const toolCalls: LLMToolCall[] = [];
        let candidateText = '';

        for (const part of parts) {
          if (part.functionCall) {
            toolCalls.push({
              id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: part.functionCall.name,
              arguments: part.functionCall.args || {},
            });
          }
          if (part.text) {
            candidateText += part.text;
          }
        }

        return {
          text: candidateText.trim(),
          toolCalls,
          provider: this.name,
          model: currentModel,
        };
      } catch (err: any) {
        if (currentModel === modelsToTry[modelsToTry.length - 1]) {
          throw err;
        }
      }
    }

    throw new Error('All Gemini models encountered rate limits (429).');
  }
}
