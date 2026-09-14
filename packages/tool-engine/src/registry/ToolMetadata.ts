export type ToolCategory =
  | 'desktop'
  | 'browser'
  | 'vision'
  | 'memory'
  | 'coding'
  | 'voice'
  | 'mail'
  | 'system';

export interface ToolParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
}

export interface ToolMetadata {
  id: string;
  name: string;
  description?: string;
  category: ToolCategory;
  parameters?: Record<string, ToolParameterDefinition>;
  permissions?: string[];
  confirmationRequired?: boolean;
  timeout?: number;
  supportsRetry?: boolean;
  capabilities?: string[];
  tags?: string[];
  version?: string;
}
