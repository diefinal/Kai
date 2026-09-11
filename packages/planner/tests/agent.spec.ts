import { describe, it, expect } from 'vitest';
import {
  AgentLoop,
  AgentState,
  AgentEvent,
  Goal,
  PlanBuilder,
  TaskScheduler,
  ExecutionContext,
  TaskStatus,
  Plan,
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

    const scheduledPlan = await loop.run(sampleGoal);

    expect(scheduledPlan).toBeDefined();
    expect(scheduledPlan.goal).toBe(sampleGoal);
    expect(scheduledPlan.tasks).toHaveLength(2);
    expect(scheduledPlan.tasks[0].title).toBe('Capture Screen');
    expect(scheduledPlan.tasks[1].title).toBe('OCR');
    expect(loop.getState()).toBe(AgentState.Completed);

    // Context contains intermediate and goal references
    const context = loop.getContext();
    expect(context.get('currentGoal')).toBe(sampleGoal);
    expect(context.get('currentPlan')).toBe(scheduledPlan);
  });

  it('Empty plan', async () => {
    const loop = new AgentLoop();
    const unknownGoal: Goal = {
      id: 'g-unknown',
      instruction: 'Unknown instruction that produces no tasks',
      createdAt: Date.now(),
    };

    const plan = await loop.run(unknownGoal);

    expect(plan.tasks).toEqual([]);
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
    const plan = await loop.run(sampleGoal);

    expect(plan).toBeDefined();
    expect(customContext.get('currentGoal')).toBe(sampleGoal);
  });
});
