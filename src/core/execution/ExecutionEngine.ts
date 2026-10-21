import { toolRegistry } from '../tools/registry';
import { permissionManager } from '../permissions/PermissionManager';
import { ToolExecutionContext, ToolExecutionResult } from '../tools/types';

export interface ExecutionResponse {
  status: 'COMPLETED' | 'CONFIRMATION_REQUIRED' | 'FAILED';
  toolName: string;
  result?: ToolExecutionResult;
  error?: string;
  confirmationReason?: string;
  validatedArgs?: any;
}

export class ExecutionEngine {
  public async executeTool(
    toolName: string,
    rawArgs: unknown,
    context?: ToolExecutionContext
  ): Promise<ExecutionResponse> {
    const tool = toolRegistry.get(toolName);
    if (!tool) {
      return {
        status: 'FAILED',
        toolName,
        error: `Tool "${toolName}" is not registered in ToolRegistry.`,
      };
    }

    // 1. Validate untrusted arguments with Zod
    const validation = tool.validateInput(rawArgs);
    if (!validation.success) {
      return {
        status: 'FAILED',
        toolName,
        error: `Invalid arguments for tool "${toolName}": ${validation.error}`,
      };
    }

    const validatedArgs = validation.data;

    // 2. Permission check
    const perm = permissionManager.evaluate(tool, validatedArgs, context);
    if (!perm.allowed && perm.requiresConfirmation) {
      return {
        status: 'CONFIRMATION_REQUIRED',
        toolName,
        confirmationReason: perm.reason,
        validatedArgs,
      };
    }

    // 3. Execute with safety boundary
    try {
      const executionResult = await tool.execute(validatedArgs, context);
      return {
        status: executionResult.success ? 'COMPLETED' : 'FAILED',
        toolName,
        result: executionResult,
        error: executionResult.error,
        validatedArgs,
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        toolName,
        error: err.message || `Unhandled error during execution of "${toolName}"`,
        validatedArgs,
      };
    }
  }
}

export const executionEngine = new ExecutionEngine();
