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

  const waitForEvent = (eventName: string) => {
    return new Promise(resolve => {
      eventBus.subscribe(eventName, resolve);
    });
  };

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
    
    const promise = waitForEvent(EventTypes.ExecutionCompleted);
    await engine.submit(plan);
    await promise;
    
    expect(events.map(e => e.name)).toEqual([
      EventTypes.ExecutionCreated,
      EventTypes.Checkpoint, // QUEUED
      EventTypes.Checkpoint, // PLANNING
      EventTypes.Checkpoint, // EXECUTING
      EventTypes.ExecutionStarted,
      EventTypes.StepStarted,
      EventTypes.StepCompleted,
      EventTypes.Checkpoint, // check
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
    
    const promise = waitForEvent(EventTypes.ExecutionCompleted);
    await engine.submit(plan);
    await promise;
    
    expect(events.filter(e => e.name === EventTypes.StepStarted).length).toBe(2);
    expect(events.find(e => e.name === EventTypes.ExecutionCompleted)).toBeDefined();
  });

  it('Pauses for permission and resumes when granted', async () => {
    const executorFn = vi.fn().mockResolvedValue(new StepResult(true, 'ok'));
    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    
    const plan = new ExecutionPlan('plan-3', [
      new ExecutionStep('step-1', 'testTool', {}, true)
    ]);
    
    const permissionPromise = waitForEvent(EventTypes.PermissionRequested);
    await engine.submit(plan);
    await permissionPromise;
    
    expect(events.find(e => e.name === EventTypes.PermissionRequested)).toBeDefined();
    expect(events.find(e => e.name === EventTypes.ExecutionCompleted)).toBeUndefined();
    
    const completionPromise = waitForEvent(EventTypes.ExecutionCompleted);
    await engine.providePermission('plan-3', true);
    await completionPromise;
    
    expect(events.find(e => e.name === EventTypes.PermissionGranted)).toBeDefined();
    expect(events.find(e => e.name === EventTypes.ExecutionCompleted)).toBeDefined();
  });

  it('Fails workflow when permission is denied', async () => {
    const executorFn = vi.fn().mockResolvedValue(new StepResult(true, 'ok'));
    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    
    const plan = new ExecutionPlan('plan-4', [
      new ExecutionStep('step-1', 'testTool', {}, true)
    ]);
    
    const permissionPromise = waitForEvent(EventTypes.PermissionRequested);
    await engine.submit(plan);
    await permissionPromise;
    
    const failurePromise = waitForEvent(EventTypes.ExecutionFailed);
    await engine.providePermission('plan-4', false);
    await failurePromise;
    
    expect(events.find(e => e.name === EventTypes.PermissionDenied)).toBeDefined();
    expect(events.find(e => e.name === EventTypes.ExecutionFailed)).toBeDefined();
  });

  it('Recovers from checkpoint', async () => {
    const executorFn = vi.fn().mockResolvedValue(new StepResult(true, 'ok'));
    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    
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
    
    const completionPromise = waitForEvent(EventTypes.ExecutionCompleted);
    await engine.providePermission('plan-5', true);
    await completionPromise;
    
    expect(events.find(e => e.name === EventTypes.ExecutionCompleted)).toBeDefined();
    expect(events.find(e => e.name === EventTypes.StepStarted && e.payload.stepId === 'step-1')).toBeDefined();
    expect(events.find(e => e.name === EventTypes.StepStarted && e.payload.stepId === 'step-0')).toBeUndefined();
  });
});

