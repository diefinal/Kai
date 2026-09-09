const fs = require('fs');
const path = require('path');

const rootDir = path.join('d:/Kai', 'packages', 'execution-engine');

const dirs = [
  'src/interfaces',
  'src/events',
  'src/state',
  'src/queue',
  'src/workflow',
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
`);

// ---------------------------------------------------------
// 2. EVENTS
// ---------------------------------------------------------
writeFile('src/events/index.ts', `
import { IEventBus } from '../interfaces';
import { EventEmitter } from 'events';

export enum EventTypes {
  ExecutionCreated = 'ExecutionCreated',
  ExecutionStarted = 'ExecutionStarted',
  StepStarted = 'StepStarted',
  StepCompleted = 'StepCompleted',
  ExecutionCompleted = 'ExecutionCompleted',
  ExecutionFailed = 'ExecutionFailed',
  PermissionRequested = 'PermissionRequested',
  PermissionGranted = 'PermissionGranted',
  PermissionDenied = 'PermissionDenied',
  Checkpoint = 'Checkpoint'
}

export class EventDispatcher {
  constructor(private bus: IEventBus) {}
  dispatch(event: EventTypes, payload: any) {
    this.bus.publish(event, payload);
  }
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
// 3. STATE
// ---------------------------------------------------------
writeFile('src/state/index.ts', `
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
    [ExecutionStatus.EXECUTING]: [ExecutionStatus.PAUSED, ExecutionStatus.RETRYING, ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED],
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
`);

// ---------------------------------------------------------
// 4. WORKFLOW
// ---------------------------------------------------------
writeFile('src/workflow/index.ts', `
export class WorkflowContext {
  public data: Record<string, any> = {};
}

export class ExecutionStep {
  constructor(
    public id: string,
    public toolName: string,
    public payload: any,
    public requiresPermission: boolean = false,
    public maxRetries: number = 0
  ) {}
}

export class ExecutionPlan {
  constructor(
    public id: string,
    public steps: ExecutionStep[],
    public context: WorkflowContext = new WorkflowContext()
  ) {}
}

export class StepResult {
  constructor(
    public success: boolean,
    public output?: any,
    public error?: string
  ) {}
}
`);

// ---------------------------------------------------------
// 5. QUEUE
// ---------------------------------------------------------
writeFile('src/queue/index.ts', `
export class TaskQueue {
  private queue: any[] = [];
  
  enqueue(item: any) {
    this.queue.push(item);
  }
  
  dequeue() {
    return this.queue.shift();
  }
  
  get length() {
    return this.queue.length;
  }
}

export class RetryPolicy {
  static shouldRetry(currentAttempts: number, maxRetries: number): boolean {
    return currentAttempts < maxRetries;
  }
}
`);

// ---------------------------------------------------------
// 6. CORE
// ---------------------------------------------------------
writeFile('src/core/index.ts', `
import { IExecutionEngine, IEventBus, ICheckpointStore } from '../interfaces';
import { EventDispatcher, EventTypes } from '../events';
import { ExecutionStatus, ExecutionStateMachine } from '../state';
import { ExecutionPlan, StepResult } from '../workflow';
import { TaskQueue, RetryPolicy } from '../queue';

export class ExecutionContext {
  public status: ExecutionStatus = ExecutionStatus.CREATED;
  public currentStepIndex: number = 0;
  public stepRetries: Record<string, number> = {};
  
  constructor(public plan: ExecutionPlan) {}
}

export class ExecutionManager {
  private contexts = new Map<string, ExecutionContext>();
  private dispatcher: EventDispatcher;

  constructor(
    private eventBus: IEventBus,
    private checkpointStore: ICheckpointStore,
    private executorFn: (step: any, ctx: any) => Promise<StepResult>
  ) {
    this.dispatcher = new EventDispatcher(eventBus);
  }

  private async changeState(ctx: ExecutionContext, newState: ExecutionStatus) {
    if (!ExecutionStateMachine.validate(ctx.status, newState)) {
      throw new Error(\`Invalid state transition from \${ctx.status} to \${newState}\`);
    }
    ctx.status = newState;
    await this.checkpointStore.save(ctx.plan.id, ctx);
    this.dispatcher.dispatch(EventTypes.Checkpoint, { id: ctx.plan.id, state: ctx.status });
  }

  async submit(plan: ExecutionPlan) {
    const ctx = new ExecutionContext(plan);
    this.contexts.set(plan.id, ctx);
    
    this.dispatcher.dispatch(EventTypes.ExecutionCreated, { id: plan.id });
    
    await this.changeState(ctx, ExecutionStatus.QUEUED);
    
    // Simulate picking up from queue immediately for now
    this.process(ctx.plan.id);
    return plan.id;
  }

  async recover(executionId: string) {
    const state = await this.checkpointStore.load(executionId);
    if (!state) throw new Error('Checkpoint not found');
    
    const plan = new ExecutionPlan(state.plan.id, state.plan.steps, state.plan.context);
    const ctx = new ExecutionContext(plan);
    ctx.status = state.status;
    ctx.currentStepIndex = state.currentStepIndex;
    ctx.stepRetries = state.stepRetries || {};
    this.contexts.set(executionId, ctx);
    
    if (ctx.status === ExecutionStatus.WAITING_PERMISSION || ctx.status === ExecutionStatus.EXECUTING || ctx.status === ExecutionStatus.RETRYING) {
        // Automatically resume
        if (ctx.status !== ExecutionStatus.WAITING_PERMISSION) {
            await this.changeState(ctx, ExecutionStatus.EXECUTING);
        }
        this.process(executionId);
    }
  }

  async providePermission(executionId: string, granted: boolean) {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return;
    
    if (ctx.status !== ExecutionStatus.WAITING_PERMISSION) return;

    if (granted) {
      this.dispatcher.dispatch(EventTypes.PermissionGranted, { id: executionId });
      await this.changeState(ctx, ExecutionStatus.EXECUTING);
      this.process(executionId);
    } else {
      this.dispatcher.dispatch(EventTypes.PermissionDenied, { id: executionId });
      await this.changeState(ctx, ExecutionStatus.FAILED);
      this.dispatcher.dispatch(EventTypes.ExecutionFailed, { id: executionId, reason: 'Permission denied' });
    }
  }

  private async process(executionId: string) {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return;

    if (ctx.status === ExecutionStatus.QUEUED) {
      await this.changeState(ctx, ExecutionStatus.PLANNING);
      await this.changeState(ctx, ExecutionStatus.EXECUTING);
      this.dispatcher.dispatch(EventTypes.ExecutionStarted, { id: executionId });
    }

    while (ctx.currentStepIndex < ctx.plan.steps.length) {
      const step = ctx.plan.steps[ctx.currentStepIndex];
      
      if (step.requiresPermission && ctx.status !== ExecutionStatus.WAITING_PERMISSION && ctx.status !== ExecutionStatus.EXECUTING) {
         // Need permission
         await this.changeState(ctx, ExecutionStatus.WAITING_PERMISSION);
         this.dispatcher.dispatch(EventTypes.PermissionRequested, { id: executionId, stepId: step.id });
         return; // Wait for permission
      }
      
      // If we resumed from waiting permission, we are now EXECUTING.
      // Make sure we are in EXECUTING state.
      if (ctx.status === ExecutionStatus.WAITING_PERMISSION) {
          return; // Still waiting
      }

      this.dispatcher.dispatch(EventTypes.StepStarted, { id: executionId, stepId: step.id });
      
      try {
        const result = await this.executorFn(step, ctx.plan.context);
        if (result.success) {
          ctx.currentStepIndex++;
          this.dispatcher.dispatch(EventTypes.StepCompleted, { id: executionId, stepId: step.id, result: result.output });
          await this.checkpointStore.save(ctx.plan.id, ctx); // checkpoint
        } else {
          // Handle retry
          const retries = ctx.stepRetries[step.id] || 0;
          if (RetryPolicy.shouldRetry(retries, step.maxRetries)) {
            ctx.stepRetries[step.id] = retries + 1;
            await this.changeState(ctx, ExecutionStatus.RETRYING);
            await this.changeState(ctx, ExecutionStatus.EXECUTING);
            continue; // retry loop
          } else {
            await this.changeState(ctx, ExecutionStatus.FAILED);
            this.dispatcher.dispatch(EventTypes.ExecutionFailed, { id: executionId, error: result.error });
            return;
          }
        }
      } catch (err: any) {
         await this.changeState(ctx, ExecutionStatus.FAILED);
         this.dispatcher.dispatch(EventTypes.ExecutionFailed, { id: executionId, error: err.message });
         return;
      }
    }

    if (ctx.status === ExecutionStatus.EXECUTING) {
       await this.changeState(ctx, ExecutionStatus.COMPLETED);
       this.dispatcher.dispatch(EventTypes.ExecutionCompleted, { id: executionId });
    }
  }
}

export class ExecutionEngine implements IExecutionEngine {
  private manager: ExecutionManager;
  
  constructor(
    eventBus: IEventBus,
    checkpointStore: ICheckpointStore,
    executorFn: (step: any, ctx: any) => Promise<StepResult>
  ) {
    this.manager = new ExecutionManager(eventBus, checkpointStore, executorFn);
  }

  async submit(plan: ExecutionPlan): Promise<string> {
    return this.manager.submit(plan);
  }

  async providePermission(executionId: string, granted: boolean): Promise<void> {
    return this.manager.providePermission(executionId, granted);
  }

  async recover(executionId: string): Promise<void> {
    return this.manager.recover(executionId);
  }
}
`);

// ---------------------------------------------------------
// 7. EXPORT INDEX
// ---------------------------------------------------------
writeFile('src/index.ts', `
export * from './interfaces';
export * from './events';
export * from './state';
export * from './workflow';
export * from './queue';
export * from './core';
`);

// ---------------------------------------------------------
// 8. TESTS
// ---------------------------------------------------------
writeFile('tests/execution.spec.ts', `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  ExecutionEngine, 
  EventBus, 
  MemoryCheckpointStore, 
  ExecutionPlan, 
  ExecutionStep, 
  EventTypes,
  ExecutionStateMachine,
  ExecutionStatus,
  StepResult
} from '../src';

describe('Execution Engine Core', () => {
  let eventBus: EventBus;
  let checkpointStore: MemoryCheckpointStore;
  let events: any[] = [];
  
  beforeEach(() => {
    eventBus = new EventBus();
    checkpointStore = new MemoryCheckpointStore();
    events = [];
    
    const track = (name: string) => eventBus.subscribe(name, (p) => events.push({ name, payload: p }));
    Object.values(EventTypes).forEach(track);
  });

  it('Validates state transitions correctly', () => {
    expect(ExecutionStateMachine.validate(ExecutionStatus.CREATED, ExecutionStatus.QUEUED)).toBe(true);
    expect(ExecutionStateMachine.validate(ExecutionStatus.CREATED, ExecutionStatus.COMPLETED)).toBe(false);
  });

  it('Successfully completes a workflow', async () => {
    const executorFn = vi.fn().mockResolvedValue(new StepResult(true, 'ok'));
    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    
    const plan = new ExecutionPlan('plan-1', [
      new ExecutionStep('step-1', 'testTool', {})
    ]);
    
    await engine.submit(plan);
    
    expect(events.map(e => e.name)).toEqual([
      EventTypes.ExecutionCreated,
      EventTypes.Checkpoint, // QUEUED
      EventTypes.Checkpoint, // PLANNING
      EventTypes.Checkpoint, // EXECUTING
      EventTypes.ExecutionStarted,
      EventTypes.StepStarted,
      EventTypes.StepCompleted,
      EventTypes.Checkpoint, // COMPLETED
      EventTypes.ExecutionCompleted
    ]);
  });

  it('Handles retry mechanism', async () => {
    let attempts = 0;
    const executorFn = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts === 1) return Promise.resolve(new StepResult(false, null, 'Fail 1'));
      return Promise.resolve(new StepResult(true, 'ok'));
    });
    
    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    const plan = new ExecutionPlan('plan-2', [
      new ExecutionStep('step-1', 'testTool', {}, false, 1) // 1 retry allowed
    ]);
    
    await engine.submit(plan);
    
    // Attempt 1 fails -> Retrying -> Attempt 2 succeeds
    expect(events.filter(e => e.name === EventTypes.StepStarted).length).toBe(2);
    expect(events.find(e => e.name === EventTypes.ExecutionCompleted)).toBeDefined();
  });

  it('Pauses for permission and resumes when granted', async () => {
    const executorFn = vi.fn().mockResolvedValue(new StepResult(true, 'ok'));
    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    
    const plan = new ExecutionPlan('plan-3', [
      new ExecutionStep('step-1', 'testTool', {}, true) // requires permission
    ]);
    
    await engine.submit(plan);
    
    // Should stop at WAITING_PERMISSION
    expect(events.find(e => e.name === EventTypes.PermissionRequested)).toBeDefined();
    expect(events.find(e => e.name === EventTypes.ExecutionCompleted)).toBeUndefined();
    
    // Grant permission
    await engine.providePermission('plan-3', true);
    
    expect(events.find(e => e.name === EventTypes.PermissionGranted)).toBeDefined();
    expect(events.find(e => e.name === EventTypes.ExecutionCompleted)).toBeDefined();
  });

  it('Fails workflow when permission is denied', async () => {
    const executorFn = vi.fn().mockResolvedValue(new StepResult(true, 'ok'));
    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    
    const plan = new ExecutionPlan('plan-4', [
      new ExecutionStep('step-1', 'testTool', {}, true)
    ]);
    
    await engine.submit(plan);
    await engine.providePermission('plan-4', false);
    
    expect(events.find(e => e.name === EventTypes.PermissionDenied)).toBeDefined();
    expect(events.find(e => e.name === EventTypes.ExecutionFailed)).toBeDefined();
  });

  it('Recovers from checkpoint', async () => {
    const executorFn = vi.fn().mockResolvedValue(new StepResult(true, 'ok'));
    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    
    // Simulate a saved state where step 0 is done, currently waiting permission on step 1
    const dummyCtx = {
        status: ExecutionStatus.WAITING_PERMISSION,
        currentStepIndex: 1,
        plan: new ExecutionPlan('plan-5', [
            new ExecutionStep('step-0', 't', {}),
            new ExecutionStep('step-1', 't', {}, true)
        ])
    };
    await checkpointStore.save('plan-5', dummyCtx);
    
    await engine.recover('plan-5');
    
    // Give permission for step-1
    await engine.providePermission('plan-5', true);
    
    expect(events.find(e => e.name === EventTypes.ExecutionCompleted)).toBeDefined();
    expect(events.find(e => e.name === EventTypes.StepStarted && e.payload.stepId === 'step-1')).toBeDefined();
    expect(events.find(e => e.name === EventTypes.StepStarted && e.payload.stepId === 'step-0')).toBeUndefined();
  });
});
`);
