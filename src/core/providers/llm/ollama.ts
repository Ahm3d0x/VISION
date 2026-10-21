import { ILLMProvider, LLMMessage, LLMResponse, LLMToolCall, LLMToolDeclaration } from './types';

export interface OllamaProviderOptions {
  baseUrl?: string;
  modelName?: string;
  temperature?: number;
  numCtx?: number;
}

export class OllamaQwenProvider implements ILLMProvider {
  public readonly name = 'ollama';
  public readonly defaultModel = 'qwen3:8b';

  private baseUrl: string;
  private model: string;
  private temperature: number;
  private numCtx: number;

  constructor(options?: OllamaProviderOptions) {
    this.baseUrl = (options?.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
    this.model = options?.modelName || this.defaultModel;
    this.temperature = options?.temperature ?? 0.4;
    // Set to 8192 by default to keep VRAM around 9.5GB on 12GB GPUs (prevents PCIe memory paging slowdown)
    this.numCtx = options?.numCtx ?? 8192;
  }

  public setModel(model: string) {
    this.model = model;
  }

  public getModel(): string {
    return this.model;
  }

  public async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(4000) });
      if (!res.ok) return false;
      const data = await res.json();
      const models = data?.models || [];
      return models.some((m: any) => m.name.includes(this.model) || m.name.startsWith(this.model.split(':')[0]));
    } catch {
      return false;
    }
  }

  public async chat(
    messages: LLMMessage[],
    tools?: LLMToolDeclaration[]
  ): Promise<LLMResponse> {
    const payload: Record<string, any> = {
      model: this.model,
      stream: false,
      options: {
        temperature: this.temperature,
        num_ctx: this.numCtx,
        num_predict: 8192,
      },
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3-minute safety watchdog

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Ollama request timed out after 180s. The local model (${this.model}) took too long to generate.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ollama Error (${response.status}): ${errText || response.statusText}`);
    }

    const data = await response.json();
    const msg = data?.message || {};
    const thinking = msg.thinking || '';
    const content = (msg.content || '').trim();

    const toolCalls: LLMToolCall[] = [];
    if (Array.isArray(msg.tool_calls)) {
      for (const call of msg.tool_calls) {
        if (call.function) {
          let args = call.function.arguments;
          if (typeof args === 'string') {
            try {
              args = JSON.parse(args);
            } catch {
              args = {};
            }
          }
          toolCalls.push({
            id: call.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: call.function.name,
            arguments: args || {},
          });
        }
      }
    }

    return {
      text: content,
      thinking: thinking.trim() || undefined,
      toolCalls,
      provider: this.name,
      model: this.model,
      usage: {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
  }
}
