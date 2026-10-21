import { z } from 'zod';
import { Tool, PermissionLevel, RiskLevel, ToolExecutionContext, ToolExecutionResult } from './types';
import { LLMToolDeclaration, ToolParameterProperty } from '../providers/llm/types';

export interface CreateToolOptions<TShape extends z.ZodRawShape = any, TOutput = any> {
  name: string;
  description: string;
  category: Tool['category'];
  permissionLevel: PermissionLevel;
  riskLevel: RiskLevel;
  schema: z.ZodObject<TShape>;
  paramDescriptions?: Record<keyof TShape, { type: ToolParameterProperty['type']; description: string; enum?: string[] }>;
  execute: (input: z.infer<z.ZodObject<TShape>>, context?: ToolExecutionContext) => Promise<ToolExecutionResult<TOutput>>;
}

export function createTool<TShape extends z.ZodRawShape = any, TOutput = any>(
  options: CreateToolOptions<TShape, TOutput>
): Tool<z.infer<z.ZodObject<TShape>>, TOutput> {
  const shape = options.schema.shape;
  const properties: Record<string, ToolParameterProperty> = {};
  const required: string[] = [];

  for (const key of Object.keys(shape)) {
    const fieldDef = shape[key];
    const isOptional = fieldDef.isOptional();
    if (!isOptional) {
      required.push(key);
    }

    const customMeta = options.paramDescriptions?.[key];
    if (customMeta) {
      properties[key] = {
        type: customMeta.type,
        description: customMeta.description,
        enum: customMeta.enum,
      };
    } else {
      let inferredType: ToolParameterProperty['type'] = 'string';
      if (fieldDef instanceof z.ZodNumber) inferredType = 'number';
      else if (fieldDef instanceof z.ZodBoolean) inferredType = 'boolean';
      else if (fieldDef instanceof z.ZodArray) inferredType = 'array';
      else if (fieldDef instanceof z.ZodObject) inferredType = 'object';

      properties[key] = {
        type: inferredType,
        description: fieldDef.description || `Parameter ${key}`,
      };
    }
  }

  return {
    name: options.name,
    description: options.description,
    category: options.category,
    permissionLevel: options.permissionLevel,
    riskLevel: options.riskLevel,
    schema: options.schema,

    toLLMDeclaration(): LLMToolDeclaration {
      return {
        type: 'function',
        function: {
          name: options.name,
          description: options.description,
          parameters: {
            type: 'object',
            properties,
            required,
          },
        },
      };
    },

    validateInput(args: unknown) {
      const parsed = options.schema.safeParse(args);
      if (parsed.success) {
        return { success: true, data: parsed.data };
      }
      return {
        success: false,
        error: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
    },

    async execute(input, context) {
      return options.execute(input, context);
    },
  };
}
