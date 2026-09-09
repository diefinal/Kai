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
