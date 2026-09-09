const fs = require('fs');
const path = require('path');

const rootDir = path.join('d:/Kai', 'packages', 'tool-engine');

const dirs = [
  'src/interfaces',
  'src/events',
  'src/core',
  'tests'
];

dirs.forEach(d => fs.mkdirSync(path.join(rootDir, d), { recursive: true }));

const writeFile = (filePath, content) => {
  fs.writeFileSync(path.join(rootDir, filePath), content.trim() + '\n');
};

// ---------------------------------------------------------
// 1. INTERFACES
// ---------------------------------------------------------
writeFile('src/interfaces/index.ts', `
export interface IEventPublisher {
  publish(eventName: string, payload: any): void;
}
export interface IEventSubscriber {
  subscribe(eventName: string, handler: (payload: any) => void): void;
}
export interface IEventBus extends IEventPublisher, IEventSubscriber {}

export interface ICapability {
  name: string;
  description?: string;
}

export interface ITool {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  permissions: string[];
  priority: number;
  supportedPlatforms: string[]; // 'windows', 'mac', 'linux', 'any'
  execute(capability: string, context: any): Promise<any>;
}

export interface IToolRegistry {
  register(tool: ITool): void;
  getToolsByCapability(capability: string): ITool[];
  getAllTools(): ITool[];
}

export interface IToolResolver {
  resolve(capability: string, platform: string): ITool | null;
}

export interface IToolExecutor {
  execute(tool: ITool, capability: string, context: any): Promise<any>;
}
`);

// ---------------------------------------------------------
// 2. EVENTS
// ---------------------------------------------------------
writeFile('src/events/index.ts', `
import { IEventBus } from '../interfaces';
import { EventEmitter } from 'events';

export enum ToolEventTypes {
  ToolRegistered = 'ToolRegistered',
  ToolLoaded = 'ToolLoaded',
  ToolResolved = 'ToolResolved',
  ToolExecuted = 'ToolExecuted',
  ToolFailed = 'ToolFailed'
}

export class EventBus implements IEventBus {
  private emitter = new EventEmitter();
  
  publish(eventName: string, payload: any): void {
    this.emitter.emit(eventName, payload);
  }
  
  subscribe(eventName: string, handler: (payload: any) => void): void {
    this.emitter.on(eventName, handler);
  }
}
`);

// ---------------------------------------------------------
// 3. CORE
// ---------------------------------------------------------
writeFile('src/core/index.ts', `
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
      throw new Error(\`Tool with ID \${tool.id} is already registered.\`);
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
      throw new Error(\`Tool \${tool.id} does not support capability \${capability}\`);
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
      throw new Error(\`No suitable tool found for capability \${capability} on platform \${this.currentPlatform}\`);
    }
    return this.executor.execute(tool, capability, context);
  }
}
`);

// ---------------------------------------------------------
// 4. EXPORT INDEX
// ---------------------------------------------------------
writeFile('src/index.ts', `
export * from './interfaces';
export * from './events';
export * from './core';
`);

// ---------------------------------------------------------
// 5. TESTS
// ---------------------------------------------------------
writeFile('tests/tool-engine.spec.ts', `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  ToolEngine, 
  EventBus, 
  ToolEventTypes,
  ITool,
  ToolContext
} from '../src';

class MockTool implements ITool {
  constructor(
    public id: string,
    public name: string,
    public priority: number,
    public capabilities: string[],
    public supportedPlatforms: string[] = ['any'],
    public permissions: string[] = []
  ) {}
  
  version = '1.0.0';
  
  async execute(capability: string, context: any) {
    return \`Success: \${capability} by \${this.id}\`;
  }
}

describe('Tool Engine Core', () => {
  let eventBus: EventBus;
  let engine: ToolEngine;
  let events: any[] = [];
  
  beforeEach(() => {
    eventBus = new EventBus();
    events = [];
    Object.values(ToolEventTypes).forEach(type => {
      eventBus.subscribe(type, (payload) => events.push({ type, payload }));
    });
    engine = new ToolEngine(eventBus, 'windows');
  });

  it('Registers tool and finds capability', async () => {
    const tool = new MockTool('t1', 'Tool 1', 10, ['open_browser']);
    engine.registry.register(tool);
    
    expect(events.find(e => e.type === ToolEventTypes.ToolRegistered)).toBeDefined();
    
    const found = engine.registry.getToolsByCapability('open_browser');
    expect(found.length).toBe(1);
    expect(found[0].id).toBe('t1');
  });

  it('Resolver selects tool with highest priority', async () => {
    const lowPriority = new MockTool('low', 'Low', 1, ['search_web']);
    const highPriority = new MockTool('high', 'High', 100, ['search_web']);
    
    engine.registry.register(lowPriority);
    engine.registry.register(highPriority);
    
    const resolved = engine.resolver.resolve('search_web', 'windows');
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe('high');
    
    expect(events.find(e => e.type === ToolEventTypes.ToolResolved)).toBeDefined();
  });

  it('Loads plugin and executes capability', async () => {
    const pluginTool = new MockTool('plugin-1', 'Plugin', 50, ['type_keyboard'], ['windows']);
    await engine.loadPlugin(pluginTool);
    
    expect(events.find(e => e.type === ToolEventTypes.ToolLoaded)).toBeDefined();
    
    const result = await engine.executeCapability('type_keyboard', new ToolContext());
    expect(result).toBe('Success: type_keyboard by plugin-1');
    expect(events.find(e => e.type === ToolEventTypes.ToolExecuted)).toBeDefined();
  });

  it('Fires ToolFailed on execution error', async () => {
    const failingTool = new MockTool('fail', 'Fail', 10, ['read_file']);
    failingTool.execute = vi.fn().mockRejectedValue(new Error('Disk error'));
    
    engine.registry.register(failingTool);
    
    await expect(engine.executeCapability('read_file', new ToolContext())).rejects.toThrow('Disk error');
    expect(events.find(e => e.type === ToolEventTypes.ToolFailed)).toBeDefined();
  });
  
  it('Filters tools by platform correctly', async () => {
    const macTool = new MockTool('mac-tool', 'Mac', 100, ['capture_screen'], ['mac']);
    const winTool = new MockTool('win-tool', 'Win', 10, ['capture_screen'], ['windows']);
    
    engine.registry.register(macTool);
    engine.registry.register(winTool);
    
    // engine is initiated with 'windows'
    const resolved = engine.resolver.resolve('capture_screen', 'windows');
    expect(resolved!.id).toBe('win-tool'); // Even though macTool has higher priority, it doesn't support windows
  });
});
`);
