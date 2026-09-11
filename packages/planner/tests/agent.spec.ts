import { describe, it, expect } from 'vitest';
import {
  AgentLoop,
  AgentState,
  AgentEvent,
  Goal,
  PlanBuilder,
  TaskScheduler,
  ExecutionContext,
} from '../src';

describe('AgentLoop', () => {
  const sampleGoal: Goal = {
    id: 'goal-1',
    instruction: 'Read Screen',
    createdAt: Date.now(),
  };

  it('Successful workflow', async () => {
    const loop = new AgentLoop();
    const events: AgentEvent[] = [];
    loop.onEvent((e) => events.push(e));

    const result = await loop.run(sampleGoal);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.completedTasks).toBe(2);
    expect(typeof result.durationMs).toBe('number');
    expect(loop.getState()).toBe(AgentState.Completed);

    // Context contains intermediate and goal references
    const context = loop.getContext();
    expect(context.get('currentGoal')).toBe(sampleGoal);
    expect(context.get('currentPlan')).toBeDefined();
  });

  it('Empty plan', async () => {
    const loop = new AgentLoop();
    const unknownGoal: Goal = {
      id: 'g-unknown',
      instruction: 'Unknown instruction that produces no tasks',
      createdAt: Date.now(),
    };

    const result = await loop.run(unknownGoal);

    expect(result.success).toBe(true);
    expect(result.completedTasks).toBe(0);
    expect(loop.getState()).toBe(AgentState.Completed);
  });

  it('Planning failure', async () => {
    const failingBuilder = {
      build() {
        throw new Error('Planning engine failure');
      },
    } as unknown as PlanBuilder;

    const loop = new AgentLoop(failingBuilder);
    const events: AgentEvent[] = [];
    loop.onEvent((e) => events.push(e));

    await expect(loop.run(sampleGoal)).rejects.toThrow('Planning engine failure');
    expect(loop.getState()).toBe(AgentState.Failed);
    expect(events.some((e) => e.state === AgentState.Failed)).toBe(true);
  });

  it('Scheduler failure', async () => {
    const failingScheduler = {
      schedule() {
        throw new Error('Circular dependency detected');
      },
    } as unknown as TaskScheduler;

    const loop = new AgentLoop(new PlanBuilder(), failingScheduler);
    const events: AgentEvent[] = [];
    loop.onEvent((e) => events.push(e));

    await expect(loop.run(sampleGoal)).rejects.toThrow('Circular dependency detected');
    expect(loop.getState()).toBe(AgentState.Failed);
  });

  it('State transitions & Event emission order', async () => {
    const loop = new AgentLoop();
    const states: AgentState[] = [];
    loop.onEvent((e) => states.push(e.state));

    expect(loop.getState()).toBe(AgentState.Idle);

    await loop.run(sampleGoal);

    expect(states).toEqual([
      AgentState.Planning,
      AgentState.Scheduling,
      AgentState.Executing,
      AgentState.Completed,
    ]);
  });

  it('Dependency injection compatibility', async () => {
    const customBuilder = new PlanBuilder();
    const customScheduler = new TaskScheduler();
    const customContext = new ExecutionContext();

    const loop = new AgentLoop(customBuilder, customScheduler, customContext);
    const result = await loop.run(sampleGoal);

    expect(result.success).toBe(true);
    expect(customContext.get('currentGoal')).toBe(sampleGoal);
  });
});
