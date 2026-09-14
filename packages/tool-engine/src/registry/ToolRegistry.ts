import { ToolCategory } from './ToolMetadata';
import { ToolDescriptor, toDescriptor } from './ToolDescriptor';
import {
  ToolDefinition,
  ToolExecutionContext,
  ToolRegistrationOptions,
  normalizeToolDefinition,
} from './ToolDefinition';
import { ToolResolver } from './ToolResolver';
import { ToolLoader } from './ToolLoader';

export interface RegistryExecuteOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  context?: Record<string, unknown>;
  userConfirmed?: boolean;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly resolver: ToolResolver;
  private readonly loader: ToolLoader;

  constructor() {
    this.resolver = new ToolResolver(() => this.getAll());
    this.loader = new ToolLoader();
  }

  get size(): number {
    return this.tools.size;
  }

  register(tool: ToolDefinition | ToolRegistrationOptions): void {
    const def = normalizeToolDefinition(tool);
    const id = def.metadata.id;

    if (!id || !id.trim()) {
      throw new Error('Tool registration failed: Tool ID cannot be empty.');
    }

    if (!def.metadata.category) {
      throw new Error(`Tool registration failed: Tool ${id} must declare a category.`);
    }

    if (this.tools.has(id)) {
      throw new Error(`Duplicate tool registration: Tool with ID "${id}" is already registered.`);
    }

    this.tools.set(id, def);
  }

  unregister(id: string): boolean {
    return this.tools.delete(id);
  }

  has(id: string): boolean {
    return this.tools.has(id) || this.resolver.resolveById(id) !== undefined;
  }

  get(id: string): ToolDefinition | undefined {
    return this.find(id);
  }

  find(id: string): ToolDefinition | undefined {
    return this.resolver.resolveById(id);
  }

  findByCategory(category: ToolCategory): ToolDefinition[] {
    return this.resolver.resolveByCategory(category);
  }

  findByCapability(capability: string): ToolDefinition[] {
    return this.resolver.resolveByCapability(capability);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  list(): ToolDescriptor[] {
    return this.getAll().map((t) => toDescriptor(t));
  }

  describe(id: string): ToolDescriptor | undefined {
    const tool = this.find(id);
    return tool ? toDescriptor(tool) : undefined;
  }

  describeAll(): ToolDescriptor[] {
    return this.list();
  }

  getLoader(): ToolLoader {
    return this.loader;
  }

  getResolver(): ToolResolver {
    return this.resolver;
  }

  clear(): void {
    this.tools.clear();
  }

  async execute<T = unknown>(
    toolId: string,
    parameters: Record<string, unknown> = {},
    options: RegistryExecuteOptions = {}
  ): Promise<T> {
    const tool = this.find(toolId);
    if (!tool) {
      throw new Error(`Tool execution failed: Tool "${toolId}" not found in registry.`);
    }

    const timeoutMs = options.timeoutMs ?? tool.metadata.timeout ?? 10000;
    const execContext: ToolExecutionContext = {
      toolId: tool.metadata.id,
      parameters,
      signal: options.signal,
      userConfirmed: options.userConfirmed,
      extra: options.context,
    };

    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms for tool "${toolId}".`));
      }, timeoutMs);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    try {
      const executionPromise = Promise.resolve(tool.execute(parameters, execContext)) as Promise<T>;
      const result = await Promise.race([executionPromise, timeoutPromise]);
      return result;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
