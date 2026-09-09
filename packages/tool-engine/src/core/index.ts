import { ITool, IToolRegistry, IToolResolver, IToolExecutor, IEventBus } from '../interfaces';
import { ToolEventTypes } from '../events';

export class ToolContext {
  constructor(public data: Record<string, any> = {}) {}
}

export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, ITool>();

  constructor(private eventBus: IEventBus) {}

  register(tool: ITool): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with ID ${tool.id} is already registered.`);
    }
    this.tools.set(tool.id, tool);
    this.eventBus.publish(ToolEventTypes.ToolRegistered, { toolId: tool.id, capabilities: tool.capabilities });
  }

  getToolsByCapability(capability: string): ITool[] {
    const result: ITool[] = [];
    for (const tool of this.tools.values()) {
      if (tool.capabilities.includes(capability)) {
        result.push(tool);
      }
    }
    return result;
  }

  getAllTools(): ITool[] {
    return Array.from(this.tools.values());
  }
}

export class ToolResolver implements IToolResolver {
  constructor(private registry: IToolRegistry, private eventBus: IEventBus) {}

  resolve(capability: string, platform: string = 'any'): ITool | null {
    const tools = this.registry.getToolsByCapability(capability);
    
    // Filter by platform
    const platformTools = tools.filter(t => 
      t.supportedPlatforms.includes('any') || t.supportedPlatforms.includes(platform)
    );

    if (platformTools.length === 0) return null;

    // Sort by priority descending
    platformTools.sort((a, b) => b.priority - a.priority);
    
    const selected = platformTools[0];
    this.eventBus.publish(ToolEventTypes.ToolResolved, { capability, toolId: selected.id });
    
    return selected;
  }
}

export class ToolExecutor implements IToolExecutor {
  constructor(private eventBus: IEventBus) {}

  async execute(tool: ITool, capability: string, context: ToolContext): Promise<any> {
    if (!tool.capabilities.includes(capability)) {
      throw new Error(`Tool ${tool.id} does not support capability ${capability}`);
    }

    try {
      const result = await tool.execute(capability, context);
      this.eventBus.publish(ToolEventTypes.ToolExecuted, { toolId: tool.id, capability, result });
      return result;
    } catch (error: any) {
      this.eventBus.publish(ToolEventTypes.ToolFailed, { toolId: tool.id, capability, error: error.message });
      throw error;
    }
  }
}

export class ToolEngine {
  public registry: ToolRegistry;
  public resolver: ToolResolver;
  public executor: ToolExecutor;

  constructor(private eventBus: IEventBus, private currentPlatform: string = 'any') {
    this.registry = new ToolRegistry(this.eventBus);
    this.resolver = new ToolResolver(this.registry, this.eventBus);
    this.executor = new ToolExecutor(this.eventBus);
  }

  async loadPlugin(pluginObj: ITool) {
    this.registry.register(pluginObj);
    this.eventBus.publish(ToolEventTypes.ToolLoaded, { toolId: pluginObj.id });
  }

  async executeCapability(capability: string, context: ToolContext): Promise<any> {
    const tool = this.resolver.resolve(capability, this.currentPlatform);
    if (!tool) {
      throw new Error(`No suitable tool found for capability ${capability} on platform ${this.currentPlatform}`);
    }
    return this.executor.execute(tool, capability, context);
  }
}
