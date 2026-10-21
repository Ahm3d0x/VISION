import { ILLMProvider } from './types';
import { OllamaQwenProvider } from './ollama';
import { GeminiProvider } from './gemini';

export * from './types';
export * from './ollama';
export * from './gemini';

class LLMProviderManager {
  private providers: Map<string, ILLMProvider> = new Map();
  private activeProviderName: string = 'ollama';

  constructor() {
    this.register(new OllamaQwenProvider());
    this.register(new GeminiProvider());
  }

  public register(provider: ILLMProvider) {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name?: string): ILLMProvider {
    const target = name || this.activeProviderName;
    const provider = this.providers.get(target);
    if (!provider) {
      // Fallback to first available
      return this.providers.get('ollama') || this.providers.get('gemini')!;
    }
    return provider;
  }

  public setActiveProvider(name: string) {
    if (this.providers.has(name)) {
      this.activeProviderName = name;
    }
  }

  public getActiveProviderName(): string {
    return this.activeProviderName;
  }

  public async getAvailableProviders(): Promise<Array<{ name: string; available: boolean; defaultModel: string }>> {
    const results = [];
    for (const [name, provider] of this.providers.entries()) {
      const available = await provider.isAvailable().catch(() => false);
      results.push({
        name,
        available,
        defaultModel: provider.defaultModel,
      });
    }
    return results;
  }
}

export const llmProviderManager = new LLMProviderManager();
