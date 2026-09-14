import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ToolRegistry,
  ToolLoader,
  ToolResolver,
  ToolDefinition,
  ToolCategory,
  toDescriptor,
} from '../src';

describe('Unified Tool Registry (TOOL-001)', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('Registration & Duplicate Handling', () => {
    it('registers a tool with full metadata and execution handler', () => {
      registry.register({
        metadata: {
          id: 'browser.navigate',
          name: 'Navigate Browser',
          description: 'Navigates the browser to a specific URL',
          category: 'browser',
          parameters: {
            url: { type: 'string', required: true, description: 'Target URL' },
          },
          permissions: ['network'],
          confirmationRequired: false,
          timeout: 5000,
          supportsRetry: true,
        },
        execute: async (params) => {
          return { status: 200, url: params.url };
        },
      });

      expect(registry.size).toBe(1);
      expect(registry.has('browser.navigate')).toBe(true);
    });

    it('registers a tool using convenient flat registration options', () => {
      registry.register({
        id: 'windows.open',
        name: 'Open Application',
        category: 'desktop',
        parameters: {
          target: { type: 'string', required: true },
        },
        execute: async (params) => ({ launched: params.target }),
      });

      expect(registry.has('windows.open')).toBe(true);
      const tool = registry.find('windows.open');
      expect(tool).toBeDefined();
      expect(tool?.metadata.name).toBe('Open Application');
      expect(tool?.metadata.category).toBe('desktop');
    });

    it('throws error when registering duplicate tool ID', () => {
      const tool: ToolDefinition = {
        metadata: { id: 'vision.read', name: 'Read Screen', category: 'vision' },
        execute: async () => 'ok',
      };

      registry.register(tool);
      expect(() => registry.register(tool)).toThrowError(
        'Duplicate tool registration: Tool with ID "vision.read" is already registered.'
      );
    });

    it('throws error when registering tool with empty ID or missing category', () => {
      expect(() =>
        registry.register({
          id: '',
          name: 'Invalid',
          category: 'system',
          execute: async () => {},
        })
      ).toThrowError('Tool ID cannot be empty');

      expect(() =>
        registry.register({
          id: 'test.tool',
          name: 'Missing Category',
          category: '' as any,
          execute: async () => {},
        })
      ).toThrowError('must declare a category');
    });

    it('unregisters an existing tool', () => {
      registry.register({
        id: 'temp.tool',
        name: 'Temp',
        category: 'system',
        execute: async () => {},
      });

      expect(registry.has('temp.tool')).toBe(true);
      expect(registry.unregister('temp.tool')).toBe(true);
      expect(registry.has('temp.tool')).toBe(false);
      expect(registry.unregister('temp.tool')).toBe(false);
    });
  });

  describe('Discovery & Descriptors', () => {
    beforeEach(() => {
      // Register one tool per category (all 8 supported categories)
      const categories: ToolCategory[] = [
        'desktop',
        'browser',
        'vision',
        'memory',
        'coding',
        'voice',
        'mail',
        'system',
      ];

      for (const cat of categories) {
        registry.register({
          id: `${cat}.sample`,
          name: `Sample ${cat}`,
          description: `A tool for ${cat}`,
          category: cat,
          capabilities: [`cap.${cat}`],
          tags: [cat, 'sample'],
          execute: async () => `result-${cat}`,
        });
      }
    });

    it('supports all 8 required tool categories', () => {
      expect(registry.size).toBe(8);
      const list = registry.list();
      const categories = new Set(list.map((d) => d.category));
      expect(categories.size).toBe(8);
      expect(categories.has('desktop')).toBe(true);
      expect(categories.has('browser')).toBe(true);
      expect(categories.has('vision')).toBe(true);
      expect(categories.has('memory')).toBe(true);
      expect(categories.has('coding')).toBe(true);
      expect(categories.has('voice')).toBe(true);
      expect(categories.has('mail')).toBe(true);
      expect(categories.has('system')).toBe(true);
    });

    it('finds tools by category', () => {
      const browserTools = registry.findByCategory('browser');
      expect(browserTools).toHaveLength(1);
      expect(browserTools[0].metadata.id).toBe('browser.sample');

      const visionTools = registry.findByCategory('vision');
      expect(visionTools).toHaveLength(1);
      expect(visionTools[0].metadata.id).toBe('vision.sample');
    });

    it('finds tools by capability', () => {
      const tools = registry.findByCapability('cap.coding');
      expect(tools).toHaveLength(1);
      expect(tools[0].metadata.id).toBe('coding.sample');
    });

    it('generates clean descriptors without internal execution handlers', () => {
      const desc = registry.describe('mail.sample');
      expect(desc).toBeDefined();
      expect(desc?.id).toBe('mail.sample');
      expect(desc?.name).toBe('Sample mail');
      expect(desc?.category).toBe('mail');
      expect(desc?.capabilities).toEqual(['cap.mail']);
      expect((desc as any).execute).toBeUndefined();
    });

    it('resolves semantic action aliases to registered tools', () => {
      const tool = registry.find('read_screen');
      expect(tool).toBeDefined();
      expect(tool?.metadata.id).toBe('vision.sample'); // mapped to vision
    });
  });

  describe('Execution Engine Integration', () => {
    it('executes tool successfully by ID passing parameters and context', async () => {
      registry.register({
        id: 'math.add',
        name: 'Add',
        category: 'system',
        execute: async (params, ctx) => {
          const a = Number(params.a);
          const b = Number(params.b);
          return { sum: a + b, toolId: ctx?.toolId };
        },
      });

      const res = await registry.execute<any>('math.add', { a: 10, b: 25 });
      expect(res.sum).toBe(35);
      expect(res.toolId).toBe('math.add');
    });

    it('throws clear error when attempting to execute missing tool', async () => {
      await expect(registry.execute('nonexistent.tool')).rejects.toThrowError(
        'Tool execution failed: Tool "nonexistent.tool" not found in registry.'
      );
    });

    it('enforces timeout on long-running tool execution', async () => {
      registry.register({
        id: 'slow.tool',
        name: 'Slow Tool',
        category: 'system',
        timeout: 100, // 100ms
        execute: async () => {
          await new Promise((r) => setTimeout(r, 400));
          return 'done';
        },
      });

      await expect(registry.execute('slow.tool')).rejects.toThrowError(
        'Tool execution timed out after 100ms for tool "slow.tool".'
      );
    });

    it('allows caller to override execution timeout', async () => {
      registry.register({
        id: 'slow.tool2',
        name: 'Slow Tool 2',
        category: 'system',
        timeout: 5000,
        execute: async () => {
          await new Promise((r) => setTimeout(r, 200));
          return 'done';
        },
      });

      await expect(
        registry.execute('slow.tool2', {}, { timeoutMs: 50 })
      ).rejects.toThrowError(
        'Tool execution timed out after 50ms for tool "slow.tool2".'
      );
    });
  });

  describe('ToolLoader (Plugins & MCP)', () => {
    it('loads tools from plugin manifest', () => {
      const loader = registry.getLoader();
      const pluginTools = loader.loadFromPlugin({
        name: 'test-plugin',
        version: '1.2.0',
        tools: [
          {
            id: 'plugin.action1',
            name: 'Plugin Action 1',
            category: 'coding',
            execute: async () => 'p1',
          },
          {
            id: 'plugin.action2',
            name: 'Plugin Action 2',
            category: 'coding',
            execute: async () => 'p2',
          },
        ],
      });

      expect(pluginTools).toHaveLength(2);
      for (const t of pluginTools) {
        registry.register(t);
      }

      expect(registry.has('plugin.action1')).toBe(true);
      expect(registry.has('plugin.action2')).toBe(true);
      const desc = registry.describe('plugin.action1');
      expect(desc?.tags).toContain('plugin');
      expect(desc?.tags).toContain('test-plugin');
    });

    it('loads tool from MCP schema definition', async () => {
      const loader = registry.getLoader();
      const mcpTool = loader.loadFromMcp(
        {
          name: 'weather_fetch',
          description: 'Fetch current weather',
          inputSchema: {
            properties: {
              city: { type: 'string', description: 'City name' },
            },
            required: ['city'],
          },
        },
        'system',
        async (params) => ({ temp: 22, city: params.city })
      );

      registry.register(mcpTool);

      expect(registry.has('mcp.weather_fetch')).toBe(true);
      const res = await registry.execute<any>('mcp.weather_fetch', { city: 'Istanbul' });
      expect(res.temp).toBe(22);
      expect(res.city).toBe('Istanbul');
    });
  });
});
