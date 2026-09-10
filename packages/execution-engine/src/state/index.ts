import { ICheckpointStore } from '../interfaces';

export enum ExecutionStatus {
  CREATED = 'CREATED',
  QUEUED = 'QUEUED',
  PLANNING = 'PLANNING',
  WAITING_PERMISSION = 'WAITING_PERMISSION',
  EXECUTING = 'EXECUTING',
  PAUSED = 'PAUSED',
  RETRYING = 'RETRYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export class ExecutionStateMachine {
  private static validTransitions: Record<ExecutionStatus, ExecutionStatus[]> = {
    [ExecutionStatus.CREATED]: [ExecutionStatus.QUEUED, ExecutionStatus.CANCELLED],
    [ExecutionStatus.QUEUED]: [ExecutionStatus.PLANNING, ExecutionStatus.CANCELLED],
    [ExecutionStatus.PLANNING]: [ExecutionStatus.WAITING_PERMISSION, ExecutionStatus.EXECUTING, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED],
    [ExecutionStatus.WAITING_PERMISSION]: [ExecutionStatus.EXECUTING, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED],
    [ExecutionStatus.EXECUTING]: [ExecutionStatus.PAUSED, ExecutionStatus.WAITING_PERMISSION, ExecutionStatus.RETRYING, ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED],
    [ExecutionStatus.PAUSED]: [ExecutionStatus.EXECUTING, ExecutionStatus.CANCELLED],
    [ExecutionStatus.RETRYING]: [ExecutionStatus.EXECUTING, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED],
    [ExecutionStatus.COMPLETED]: [],
    [ExecutionStatus.FAILED]: [],
    [ExecutionStatus.CANCELLED]: []
  };

  static validate(from: ExecutionStatus, to: ExecutionStatus): boolean {
    return this.validTransitions[from]?.includes(to) ?? false;
  }
}

export class MemoryCheckpointStore implements ICheckpointStore {
  private store = new Map<string, any>();

  async save(executionId: string, state: any): Promise<void> {
    this.store.set(executionId, JSON.parse(JSON.stringify(state))); // Deep copy
  }

  async load(executionId: string): Promise<any | null> {
    const state = this.store.get(executionId);
    return state ? JSON.parse(JSON.stringify(state)) : null;
  }
}

export class StateSerializer {
  static serialize(state: any): string {
    return JSON.stringify(state);
  }
  static deserialize(data: string): any {
    return JSON.parse(data);
  }
}
