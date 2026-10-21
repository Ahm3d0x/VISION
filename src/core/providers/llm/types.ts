export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LLMMessage {
  role: MessageRole;
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ToolParameterProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: { type: string };
  properties?: Record<string, ToolParameterProperty>;
}

export interface LLMToolDeclaration {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, ToolParameterProperty>;
      required?: string[];
    };
  };
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LLMResponse {
  text: string;
  thinking?: string;
  toolCalls: LLMToolCall[];
  provider: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LLMProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ILLMProvider {
  readonly name: string;
  readonly defaultModel: string;
  isAvailable(): Promise<boolean>;
  chat(messages: LLMMessage[], tools?: LLMToolDeclaration[]): Promise<LLMResponse>;
}
