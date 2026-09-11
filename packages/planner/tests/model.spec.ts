import { describe, it, expect } from 'vitest';
import {
  Goal,
  Task,
  TaskStatus,
  Plan,
} from '../src';

describe('Planner Domain Model', () => {
  it('Goal creation', () => {
    const now = Date.now();
    const goal: Goal = {
      id: 'goal-1',
      instruction: 'Open notepad and write hello',
      createdAt: now,
    };

    expect(goal).toBeDefined();
    expect(goal.id).toBe('goal-1');
    expect(goal.instruction).toBe('Open notepad and write hello');
    expect(goal.createdAt).toBe(now);
  });

  it('Task creation', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Open Notepad',
      description: 'Launch notepad.exe from Windows start menu',
      status: TaskStatus.Pending,
      dependsOn: [],
    };

    expect(task).toBeDefined();
    expect(task.id).toBe('task-1');
    expect(task.title).toBe('Open Notepad');
    expect(task.description).toBe('Launch notepad.exe from Windows start menu');
    expect(task.status).toBe(TaskStatus.Pending);
    expect(task.dependsOn).toEqual([]);
  });

  it('TaskStatus values', () => {
    expect(TaskStatus.Pending).toBeDefined();
    expect(TaskStatus.Running).toBeDefined();
    expect(TaskStatus.Completed).toBeDefined();
    expect(TaskStatus.Failed).toBeDefined();
    expect(TaskStatus.Skipped).toBeDefined();

    // Verify enum values
    expect(TaskStatus.Pending).toBe(0);
    expect(TaskStatus.Running).toBe(1);
    expect(TaskStatus.Completed).toBe(2);
    expect(TaskStatus.Failed).toBe(3);
    expect(TaskStatus.Skipped).toBe(4);
  });

  it('Plan creation', () => {
    const goal: Goal = {
      id: 'goal-2',
      instruction: 'Automate data entry',
      createdAt: Date.now(),
    };

    const task1: Task = {
      id: 'task-101',
      title: 'Open browser',
      status: TaskStatus.Completed,
      dependsOn: [],
    };

    const task2: Task = {
      id: 'task-102',
      title: 'Fill form',
      description: 'Fill the input fields with test data',
      status: TaskStatus.Running,
      dependsOn: ['task-101'],
    };

    const plan: Plan = {
      goal,
      tasks: [task1, task2],
    };

    expect(plan).toBeDefined();
    expect(plan.goal).toBe(goal);
    expect(plan.tasks).toHaveLength(2);
    expect(plan.tasks[0].id).toBe('task-101');
    expect(plan.tasks[1].dependsOn).toContain('task-101');
  });

  it('Public exports', async () => {
    const planner = await import('../src');

    expect(planner).toBeDefined();
    expect(planner.name).toBe('@kai/planner');
    expect(planner.TaskStatus).toBeDefined();
  });
});
