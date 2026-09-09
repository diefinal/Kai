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
    return `Success: ${capability} by ${this.id}`;
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
