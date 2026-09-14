import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ExecutionEngine,
  EventBus,
  MemoryCheckpointStore,
  ExecutionPlan,
  ExecutionStep,
  EventTypes,
  StepResult,
} from '../src';

describe('Multi-Step Sequential Execution (PLAN-007)', () => {
  let eventBus: EventBus;
  let checkpointStore: MemoryCheckpointStore;
  let events: any[] = [];

  beforeEach(() => {
    eventBus = new EventBus();
    checkpointStore = new MemoryCheckpointStore();
    events = [];

    const track = (name: string) =>
      eventBus.subscribe(name, (p) => events.push({ name, payload: p }));
    Object.values(EventTypes).forEach(track);
  });

  const waitForEvent = (eventName: string) => {
    return new Promise((resolve) => {
      eventBus.subscribe(eventName, resolve);
    });
  };

  it('executes a single-step plan sequentially', async () => {
    const executedSteps: string[] = [];
    const executorFn = vi.fn().mockImplementation(async (step: ExecutionStep) => {
      executedSteps.push(step.id);
      return new StepResult(true, `output-${step.id}`);
    });

    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    const plan = new ExecutionPlan('plan-single', [
      new ExecutionStep('step-1', 'OPEN_APPLICATION', { target: 'chrome' }),
    ]);

    const completed = waitForEvent(EventTypes.ExecutionCompleted);
    await engine.submit(plan);
    await completed;

    expect(executedSteps).toEqual(['step-1']);
    expect(executorFn).toHaveBeenCalledTimes(1);
  });

  it('executes a two-step plan strictly in sequence', async () => {
    const executedSteps: string[] = [];
    const stepStartTimes = new Map<string, number>();
    const stepEndTimes = new Map<string, number>();

    const executorFn = vi.fn().mockImplementation(async (step: ExecutionStep) => {
      stepStartTimes.set(step.id, Date.now());
      executedSteps.push(step.id);
      // Small delay to verify non-parallel behavior
      await new Promise((r) => setTimeout(r, 20));
      stepEndTimes.set(step.id, Date.now());
      return new StepResult(true, `done-${step.id}`);
    });

    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    const plan = new ExecutionPlan('plan-two-step', [
      new ExecutionStep('step-1', 'OPEN_APPLICATION', { target: 'chrome' }),
      new ExecutionStep('step-2', 'NAVIGATE', { url: 'https://github.com' }, false, 0, {
        dependsOn: ['step-1'],
      }),
    ]);

    const completed = waitForEvent(EventTypes.ExecutionCompleted);
    await engine.submit(plan);
    await completed;

    expect(executedSteps).toEqual(['step-1', 'step-2']);
    // Verify step-1 finished before step-2 started
    const step1End = stepEndTimes.get('step-1')!;
    const step2Start = stepStartTimes.get('step-2')!;
    expect(step2Start).toBeGreaterThanOrEqual(step1End);
  });

  it('executes a three-step plan preserving exact order without parallel execution', async () => {
    const executedSteps: string[] = [];
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const executorFn = vi.fn().mockImplementation(async (step: ExecutionStep) => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);

      executedSteps.push(step.id);
      await new Promise((r) => setTimeout(r, 15));

      concurrentCount--;
      return new StepResult(true, `result-${step.id}`);
    });

    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    const plan = new ExecutionPlan('plan-three-step', [
      new ExecutionStep('step-1', 'OPEN_APPLICATION', { target: 'vscode' }),
      new ExecutionStep('step-2', 'OPEN_FOLDER', { path: 'D:\\Kai' }),
      new ExecutionStep('step-3', 'TYPE_TEXT', { text: 'code' }),
    ]);

    const completed = waitForEvent(EventTypes.ExecutionCompleted);
    await engine.submit(plan);
    await completed;

    expect(executedSteps).toEqual(['step-1', 'step-2', 'step-3']);
    // Concurrency must NEVER exceed 1 (strictly sequential)
    expect(maxConcurrent).toBe(1);
    expect(concurrentCount).toBe(0);
  });

  it('supports ExecutionPlan.fromPlan adapter format from Planner', async () => {
    const executedActions: string[] = [];

    const executorFn = vi.fn().mockImplementation(async (step: ExecutionStep) => {
      executedActions.push(step.action || step.toolName);
      return new StepResult(true, 'ok');
    });

    const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
    const plannerOutput = {
      id: 'plan-from-planner',
      steps: [
        { id: 'step-1', action: 'OPEN_APPLICATION', parameters: { target: 'notepad' }, dependsOn: [] },
        { id: 'step-2', action: 'TYPE_TEXT', parameters: { text: 'Hello World' }, dependsOn: ['step-1'] },
      ],
    };

    const plan = ExecutionPlan.fromPlan(plannerOutput);
    const completed = waitForEvent(EventTypes.ExecutionCompleted);
    await engine.submit(plan);
    await completed;

    expect(executedActions).toEqual(['OPEN_APPLICATION', 'TYPE_TEXT']);
  });
});
