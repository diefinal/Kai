import { ToolCategory } from './ToolMetadata';
import {
  ToolDefinition,
  ToolExecutionHandler,
  ToolRegistrationOptions,
  normalizeToolDefinition,
} from './ToolDefinition';

export interface McpToolSchema {
  name: string;
  description?: string;
  inputSchema?: {
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface PluginManifestLike {
  name: string;
  version?: string;
  tools: Array<ToolRegistrationOptions>;
}

export class ToolLoader {
  loadFromDefinition(
    def: ToolDefinition | ToolRegistrationOptions
  ): ToolDefinition {
    return normalizeToolDefinition(def);
  }

  loadFromPlugin(manifest: PluginManifestLike): ToolDefinition[] {
    if (!manifest || !Array.isArray(manifest.tools)) {
      throw new Error('Invalid plugin manifest: tools array is required.');
    }
    return manifest.tools.map((t) =>
      normalizeToolDefinition({
        ...t,
        version: t.version || manifest.version,
        tags: [...(t.tags || []), 'plugin', manifest.name],
      })
    );
  }

  loadFromMcp(
    schema: McpToolSchema,
    category: ToolCategory,
    handler: ToolExecutionHandler
  ): ToolDefinition {
    const params: Record<string, any> = {};
    const props = schema.inputSchema?.properties || {};
    const req = new Set(schema.inputSchema?.required || []);

    for (const [key, val] of Object.entries(props)) {
      params[key] = {
        type: val.type || 'string',
        description: val.description,
        required: req.has(key),
        enum: val.enum,
      };
    }

    return {
      metadata: {
        id: `mcp.${schema.name}`,
        name: schema.name,
        description: schema.description,
        category,
        parameters: params,
        tags: ['mcp', 'external'],
      },
      execute: handler,
    };
  }

  async loadRemote(
    tools: Array<ToolRegistrationOptions>
  ): Promise<ToolDefinition[]> {
    return tools.map((t) =>
      normalizeToolDefinition({
        ...t,
        tags: [...(t.tags || []), 'remote'],
      })
    );
  }
}
