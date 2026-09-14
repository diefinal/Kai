import { ToolCategory, ToolMetadata, ToolParameterDefinition } from './ToolMetadata';

export interface ToolExecutionContext {
  toolId: string;
  parameters: Record<string, unknown>;
  signal?: AbortSignal;
  userConfirmed?: boolean;
  session?: unknown;
  extra?: Record<string, unknown>;
}

export type ToolExecutionHandler<TParams = Record<string, unknown>, TResult = unknown> = (
  parameters: TParams,
  context?: ToolExecutionContext
) => Promise<TResult> | TResult;

export interface ToolDefinition<TParams = Record<string, unknown>, TResult = unknown> {
  metadata: ToolMetadata;
  execute: ToolExecutionHandler<TParams, TResult>;
}

export interface ToolRegistrationOptions<TParams = Record<string, unknown>, TResult = unknown> {
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
  execute: ToolExecutionHandler<TParams, TResult>;
}

export function normalizeToolDefinition<TParams = Record<string, unknown>, TResult = unknown>(
  tool: ToolDefinition<TParams, TResult> | ToolRegistrationOptions<TParams, TResult>
): ToolDefinition<TParams, TResult> {
  if ('metadata' in tool && typeof tool.execute === 'function') {
    return tool as ToolDefinition<TParams, TResult>;
  }

  const opt = tool as ToolRegistrationOptions<TParams, TResult>;
  return {
    metadata: {
      id: opt.id,
      name: opt.name,
      description: opt.description,
      category: opt.category,
      parameters: opt.parameters,
      permissions: opt.permissions,
      confirmationRequired: opt.confirmationRequired,
      timeout: opt.timeout,
      supportsRetry: opt.supportsRetry,
      capabilities: opt.capabilities,
      tags: opt.tags,
      version: opt.version,
    },
    execute: opt.execute,
  };
}
