import { describe, it, expect } from 'vitest';
import {
  ExecutionAdapter,
  ExecutionDispatcher,
  ExecutionResult,
  ExecutionQueue,
  ExecutionContext,
  AgentLoop,
  AgentState,
  Goal,
  PlanBuilder,
  TaskScheduler,
  TaskStatus,
} from '../src';

describe('Planner Execution Integration', () => {
  const sampleGoal: Goal = {
    id: 'goal-integration',
    instruction: 'Read Screen',
    createdAt: Date.now(),
  };

  it('Successful execution', async () => {
    const executedTaskIds: string[] = [];
    class MockSuccessAdapter implements ExecutionAdapter {
      async execute(
        queue: ExecutionQueue,
        context: ExecutionContext
      ): Promise<ExecutionResult> {
        for (const task of queue.tasks) {
          executedTaskIds.push(task.id);
          context.set(`result_${task.id}`, 'ok');
        }
        return {
          success: true,
          completedTasks: queue.tasks.length,
          durationMs: 42,
        };
      }
    }

    const dispatcher = new ExecutionDispatcher(new MockSuccessAdapter());
    const context = new ExecutionContext();
    const queue: ExecutionQueue = {
      tasks: [
        {
          id: 'task-1',
          title: 'Capture',
          status: TaskStatus.Pending,
          dependsOn: [],
        },
        {
          id: 'task-2',
          title: 'OCR',
          status: TaskStatus.Pending,
          dependsOn: ['task-1'],
        },
      ],
    };

    const result = await dispatcher.dispatch(queue, context);

    expect(result.success).toBe(true);
    expect(result.completedTasks).toBe(2);
    expect(result.durationMs).toBe(42);
    expect(executedTaskIds).toEqual(['task-1', 'task-2']);
    expect(context.get('result_task-1')).toBe('ok');
    expect(context.get('result_task-2')).toBe('ok');
  });

  it('Execution failure propagation', async () => {
    class MockFailingAdapter implements ExecutionAdapter {
      async execute(queue: ExecutionQueue): Promise<ExecutionResult> {
        return {
          success: false,
          completedTasks: 1,
          failedTask: queue.tasks[1]?.id || 'task-2',
          durationMs: 15,
        };
      }
    }

    const dispatcher = new ExecutionDispatcher(new MockFailingAdapter());
    const queue: ExecutionQueue = {
      tasks: [
        {
          id: 'task-1',
          title: 'Task 1',
          status: TaskStatus.Pending,
          dependsOn: [],
        },
        {
          id: 'task-2',
          title: 'Task 2',
          status: TaskStatus.Pending,
          dependsOn: ['task-1'],
        },
      ],
    };

    const result = await dispatcher.dispatch(queue, new ExecutionContext());

    expect(result.success).toBe(false);
    expect(result.completedTasks).toBe(1);
    expect(result.failedTask).toBe('task-2');
  });

  it('Context forwarding & Dispatcher ordering', async () => {
    const stepOrder: string[] = [];
    const customAdapter: ExecutionAdapter = {
      async execute(
        queue: ExecutionQueue,
        context: ExecutionContext
      ): Promise<ExecutionResult> {
        context.set('initialFlag', true);

        for (const task of queue.tasks) {
          stepOrder.push(task.id);
          context.set(`processed_${task.id}`, true);
        }

        return {
          success: true,
          completedTasks: queue.tasks.length,
          durationMs: 10,
        };
      },
    };

    const dispatcher = new ExecutionDispatcher(customAdapter);
    const context = new ExecutionContext();
    const queue: ExecutionQueue = {
      tasks: [
        { id: 'step-1', title: '1', status: TaskStatus.Pending, dependsOn: [] },
        { id: 'step-2', title: '2', status: TaskStatus.Pending, dependsOn: [] },
        { id: 'step-3', title: '3', status: TaskStatus.Pending, dependsOn: [] },
      ],
    };

    await dispatcher.dispatch(queue, context);

    expect(stepOrder).toEqual(['step-1', 'step-2', 'step-3']);
    expect(context.get('initialFlag')).toBe(true);
    expect(context.get('processed_step-1')).toBe(true);
    expect(context.get('processed_step-2')).toBe(true);
    expect(context.get('processed_step-3')).toBe(true);
  });

  it('Adapter mocking & ExecutionResult values', async () => {
    const mockAdapter: ExecutionAdapter = {
      async execute(): Promise<ExecutionResult> {
        return {
          success: true,
          completedTasks: 5,
          durationMs: 120,
        };
      },
    };

    const dispatcher = new ExecutionDispatcher(mockAdapter);
    const result = await dispatcher.dispatch({ tasks: [] }, new ExecutionContext());

    expect(result.success).toBe(true);
    expect(result.completedTasks).toBe(5);
    expect(result.durationMs).toBe(120);
    expect(result.failedTask).toBeUndefined();
  });

  it('AgentLoop integration with failing execution', async () => {
    class FailingDispatcher extends ExecutionDispatcher {
      override async dispatch(): Promise<ExecutionResult> {
        return {
          success: false,
          completedTasks: 0,
          failedTask: 'failed-step-1',
          durationMs: 5,
        };
      }
    }

    const loop = new AgentLoop(
      new PlanBuilder(),
      new TaskScheduler(),
      new ExecutionContext(),
      new FailingDispatcher()
    );

    const result = await loop.run(sampleGoal);

    expect(result.success).toBe(false);
    expect(result.failedTask).toBe('failed-step-1');
    expect(loop.getState()).toBe(AgentState.Failed);
  });
});
