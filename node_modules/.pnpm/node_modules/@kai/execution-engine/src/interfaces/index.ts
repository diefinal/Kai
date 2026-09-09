export interface IEventPublisher {
  publish(eventName: string, payload: any): void;
}

export interface IEventSubscriber {
  subscribe(eventName: string, handler: (payload: any) => void): void;
}

export interface IEventBus extends IEventPublisher, IEventSubscriber {}

export interface ICheckpointStore {
  save(executionId: string, state: any): Promise<void>;
  load(executionId: string): Promise<any | null>;
}

export interface ITask {
  id: string;
  execute(context: any): Promise<any>;
}

export interface IWorkflow {
  id: string;
  steps: any[];
}

export interface IExecutionEngine {
  submit(plan: any): Promise<string>;
  providePermission(executionId: string, granted: boolean): Promise<void>;
  recover(executionId: string): Promise<void>;
}
