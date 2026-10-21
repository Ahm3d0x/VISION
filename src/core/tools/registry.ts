import { Tool } from './types';
import { LLMToolDeclaration } from '../providers/llm/types';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private primaryToolNames: Set<string> = new Set();

  public register(tool: Tool, isPrimary: boolean = true): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Overwriting existing tool: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    if (isPrimary) {
      this.primaryToolNames.add(tool.name);
    } else {
      this.primaryToolNames.delete(tool.name);
    }
  }

  public get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }

  public getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  public getPrimaryTools(): Tool[] {
    return Array.from(this.primaryToolNames)
      .map((name) => this.tools.get(name))
      .filter((t): t is Tool => t !== undefined);
  }

  public getLLMDeclarations(): LLMToolDeclaration[] {
    const list = this.primaryToolNames.size > 0 ? this.getPrimaryTools() : this.getAll();
    return list.map((t) => t.toLLMDeclaration());
  }
}

export const toolRegistry = new ToolRegistry();
