import { describe, it, expect } from 'vitest';
import {
  TaskScheduler,
  DependencyResolver,
  Plan,
  Task,
  TaskStatus,
  Goal,
} from '../src';

describe('TaskScheduler & DependencyResolver', () => {
  const sampleGoal: Goal = {
    id: 'goal-1',
    instruction: 'Automate Task',
    createdAt: Date.now(),
  };

  const scheduler = new TaskScheduler();
  const resolver = new DependencyResolver();

  it('Linear dependencies', () => {
    const taskA: Task = {
      id: 'task-A',
      title: 'A',
      status: TaskStatus.Pending,
      dependsOn: [],
    };
    const taskB: Task = {
      id: 'task-B',
      title: 'B',
      status: TaskStatus.Pending,
      dependsOn: ['task-A'],
    };
    const taskC: Task = {
      id: 'task-C',
      title: 'C',
      status: TaskStatus.Pending,
      dependsOn: ['task-B'],
    };

    // Passed in reverse order
    const ordered = resolver.resolve([taskC, taskB, taskA]);

    expect(ordered.map((t) => t.id)).toEqual(['task-A', 'task-B', 'task-C']);
  });

  it('Branching dependencies', () => {
    const root: Task = {
      id: 'root',
      title: 'Root',
      status: TaskStatus.Pending,
      dependsOn: [],
    };
    const branch1: Task = {
      id: 'branch-1',
      title: 'Branch 1',
      status: TaskStatus.Pending,
      dependsOn: ['root'],
    };
    const branch2: Task = {
      id: 'branch-2',
      title: 'Branch 2',
      status: TaskStatus.Pending,
      dependsOn: ['root'],
    };
    const join: Task = {
      id: 'join',
      title: 'Join',
      status: TaskStatus.Pending,
      dependsOn: ['branch-1', 'branch-2'],
    };

    const ordered = resolver.resolve([join, branch2, branch1, root]);

    expect(ordered[0].id).toBe('root');
    expect(ordered[3].id).toBe('join');
    const midIds = [ordered[1].id, ordered[2].id];
    expect(midIds).toContain('branch-1');
    expect(midIds).toContain('branch-2');
  });

  it('Multiple root tasks', () => {
    const root1: Task = {
      id: 'root-1',
      title: 'Root 1',
      status: TaskStatus.Pending,
      dependsOn: [],
    };
    const root2: Task = {
      id: 'root-2',
      title: 'Root 2',
      status: TaskStatus.Pending,
      dependsOn: [],
    };
    const child: Task = {
      id: 'child',
      title: 'Child',
      status: TaskStatus.Pending,
      dependsOn: ['root-1', 'root-2'],
    };

    const ordered = resolver.resolve([child, root1, root2]);

    expect(ordered[2].id).toBe('child');
    expect([ordered[0].id, ordered[1].id]).toEqual(['root-1', 'root-2']);
  });

  it('Circular dependency detection', () => {
    const taskA: Task = {
      id: 'task-A',
      title: 'A',
      status: TaskStatus.Pending,
      dependsOn: ['task-B'],
    };
    const taskB: Task = {
      id: 'task-B',
      title: 'B',
      status: TaskStatus.Pending,
      dependsOn: ['task-A'],
    };

    expect(() => resolver.resolve([taskA, taskB])).toThrowError(
      /Circular dependency detected/i
    );
  });

  it('Completed tasks are skipped', () => {
    const task1: Task = {
      id: 't-1',
      title: 'Already Done',
      status: TaskStatus.Completed,
      dependsOn: [],
    };
    const task2: Task = {
      id: 't-2',
      title: 'Pending Step',
      status: TaskStatus.Pending,
      dependsOn: ['t-1'],
    };

    const plan: Plan = {
      goal: sampleGoal,
      tasks: [task1, task2],
    };

    const queue = scheduler.schedule(plan);

    expect(queue.tasks).toHaveLength(1);
    expect(queue.tasks[0].id).toBe('t-2');
  });

  it('Empty plan', () => {
    const emptyPlan: Plan = {
      goal: sampleGoal,
      tasks: [],
    };

    const queue = scheduler.schedule(emptyPlan);

    expect(queue).toBeDefined();
    expect(queue.tasks).toEqual([]);
  });

  it('Public exports', async () => {
    const planner = await import('../src');

    expect(planner.TaskScheduler).toBeDefined();
    expect(planner.DependencyResolver).toBeDefined();
  });
});
