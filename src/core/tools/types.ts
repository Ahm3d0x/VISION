import { z } from 'zod';
import { LLMToolDeclaration } from '../providers/llm/types';

export type PermissionLevel = 
  | 0 // Read-only / auto
  | 1 // Low risk / auto
  | 2 // Medium risk (context/policy dependent)
  | 3 // High risk (explicit confirmation required)
  | 4; // External or irreversible (strictly confirmed)

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ToolExecutionContext {
  caller: string;
  confirmed?: boolean;
}

export interface ToolExecutionResult<T = any> {
  success: boolean;
  output?: T;
  message?: string;
  error?: string;
  errorType?: string;
  diagnostics?: string;
  metadata?: Record<string, any>;
}

export interface Tool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  category: 'system' | 'app' | 'filesystem' | 'browser' | 'code' | 'automation';
  permissionLevel: PermissionLevel;
  riskLevel: RiskLevel;
  schema: z.ZodType<TInput>;
  
  // Convert tool to LLM function declaration format
  toLLMDeclaration(): LLMToolDeclaration;
  
  // Validate input arguments against Zod schema
  validateInput(args: unknown): { success: true; data: TInput } | { success: false; error: string };
  
  // Execute handler
  execute(input: TInput, context?: ToolExecutionContext): Promise<ToolExecutionResult<TOutput>>;
}
