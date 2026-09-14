import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ExecutionEngine,
  EventBus,
  MemoryCheckpointStore,
  ExecutionPlan,
  ExecutionStep,
  EventTypes,
  StepResult,
  ContextManagerLike,
} from '../src';

describe('Execution Engine Context Auto-Update (CONTEXT-001)', () => {
  let eventBus: EventBus;
  let checkpointStore: MemoryCheckpointStore;

  beforeEach(() => {
    eventBus = new EventBus();
    checkpointStore = new MemoryCheckpointStore();
  });

  const waitForEvent = (eventName: string) => {
    return new Promise((resolve) => {
      eventBus.subscribe(eventName, resolve);
    });
  };

  it('automatically updates context after OPEN_APPLICATION succeeds', async () => {
    const recordedActions: Array<{ action: string; params: any }> = [];
    const contextManagerMock: ContextManagerLike = {
      recordAction: (action, params) => {
        recordedActions.push({ action, params });
      },
    };

    const executorFn = vi.fn().mockResolvedValue(new StepResult(true, 'Chrome opened'));
    const engine = new ExecutionEngine(
      eventBus,
      checkpointStore,
      executorFn,
      contextManagerMock
    );

    const plan = new ExecutionPlan('plan-app', [
      new ExecutionStep('step-1', 'OPEN_APPLICATION', { target: 'chrome' }),
    ]);

    const completed = waitForEvent(EventTypes.ExecutionCompleted);
    await engine.submit(plan);
    await completed;

    expect(recordedActions).toHaveLength(1);
    expect(recordedActions[0].action).toBe('OPEN_APPLICATION');
    expect(recordedActions[0].params.target).toBe('chrome');
  });

  it('automatically updates context sequentially for multi-step plans', async () => {
    const recordedActions: string[] = [];
    const contextManagerMock: ContextManagerLike = {
      recordAction: (action) => {
        recordedActions.push(action);
      },
    };

    const executorFn = vi.fn().mockImplementation(async (step) => {
      return new StepResult(true, `Done ${step.id}`);
    });

    const engine = new ExecutionEngine(
      eventBus,
      checkpointStore,
      executorFn,
      contextManagerMock
    );

    const plan = new ExecutionPlan('plan-multi', [
      new ExecutionStep('step-1', 'OPEN_APPLICATION', { target: 'chrome' }),
      new ExecutionStep('step-2', 'NAVIGATE', { url: 'https://github.com' }),
    ]);

    const completed = waitForEvent(EventTypes.ExecutionCompleted);
    await engine.submit(plan);
    await completed;

    expect(recordedActions).toEqual(['OPEN_APPLICATION', 'NAVIGATE']);
  });
});
