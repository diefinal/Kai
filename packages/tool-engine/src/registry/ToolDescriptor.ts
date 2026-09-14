import { ToolCategory, ToolParameterDefinition } from './ToolMetadata';
import { ToolDefinition } from './ToolDefinition';


export interface ToolDescriptor {
  id: string;
  name: string;
  description?: string;
  category: ToolCategory;
  parameters?: Record<string, ToolParameterDefinition>;
  permissions?: string[];
  confirmationRequired: boolean;
  timeout?: number;
  supportsRetry: boolean;
  capabilities: string[];
  tags: string[];
  version?: string;
}

export function toDescriptor(tool: ToolDefinition): ToolDescriptor {
  const meta = tool.metadata;
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    category: meta.category,
    parameters: meta.parameters ? { ...meta.parameters } : undefined,
    permissions: meta.permissions ? [...meta.permissions] : [],
    confirmationRequired: Boolean(meta.confirmationRequired),
    timeout: meta.timeout,
    supportsRetry: meta.supportsRetry ?? true,
    capabilities: meta.capabilities ? [...meta.capabilities] : [meta.id],
    tags: meta.tags ? [...meta.tags] : [],
    version: meta.version,
  };
}
