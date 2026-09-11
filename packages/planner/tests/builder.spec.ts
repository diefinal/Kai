import { describe, it, expect } from 'vitest';
import {
  PlanBuilder,
  Goal,
  PlanningContext,
  PlanningRule,
  LaunchNotepadRule,
  CaptureScreenRule,
  ReadScreenRule,
  CopyTextRule,
  ListWindowsRule,
  TaskStatus,
} from '../src';

describe('Rule-Based PlanBuilder', () => {
  const builder = new PlanBuilder();

  it('Goal → Plan conversion for Open Notepad', () => {
    const goal: Goal = {
      id: 'g-1',
      instruction: 'Open Notepad',
      createdAt: Date.now(),
    };

    const plan = builder.build({ goal });

    expect(plan.goal).toBe(goal);
    expect(plan.tasks).toHaveLength(1);
    expect(plan.tasks[0].title).toBe('Launch Application');
    expect(plan.tasks[0].status).toBe(TaskStatus.Pending);
  });

  it('Goal → Plan conversion for Capture Screen', () => {
    const goal: Goal = {
      id: 'g-2',
      instruction: 'Capture Screen',
      createdAt: Date.now(),
    };

    const plan = builder.build({ goal });

    expect(plan.tasks).toHaveLength(1);
    expect(plan.tasks[0].title).toBe('Capture Screen');
  });

  it('Correct task ordering for Read Screen (Capture Screen → OCR)', () => {
    const goal: Goal = {
      id: 'g-3',
      instruction: 'Read Screen',
      createdAt: Date.now(),
    };

    const plan = builder.build({ goal });

    expect(plan.tasks).toHaveLength(2);
    expect(plan.tasks[0].title).toBe('Capture Screen');
    expect(plan.tasks[1].title).toBe('OCR');
    expect(plan.tasks[1].dependsOn).toEqual([plan.tasks[0].id]);
  });

  it('Correct task ordering for Copy Text (Capture → OCR → Clipboard)', () => {
    const goal: Goal = {
      id: 'g-4',
      instruction: 'Copy Text',
      createdAt: Date.now(),
    };

    const plan = builder.build({ goal });

    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks[0].title).toBe('Capture');
    expect(plan.tasks[1].title).toBe('OCR');
    expect(plan.tasks[2].title).toBe('Clipboard');
    expect(plan.tasks[1].dependsOn).toEqual([plan.tasks[0].id]);
    expect(plan.tasks[2].dependsOn).toEqual([plan.tasks[1].id]);
  });

  it('Goal → Plan conversion for List Windows', () => {
    const goal: Goal = {
      id: 'g-5',
      instruction: 'List Windows',
      createdAt: Date.now(),
    };

    const plan = builder.build({ goal });

    expect(plan.tasks).toHaveLength(1);
    expect(plan.tasks[0].title).toBe('Get Windows');
  });

  it('Unknown goals return empty plan', () => {
    const goal: Goal = {
      id: 'g-unknown',
      instruction: 'Do something completely random and unknown',
      createdAt: Date.now(),
    };

    const plan = builder.build({ goal });

    expect(plan.goal).toBe(goal);
    expect(plan.tasks).toEqual([]);
  });

  it('Multiple rules remain isolated', () => {
    const customRule: PlanningRule = {
      matches(ctx: PlanningContext) {
        return ctx.goal.instruction === 'Custom Action';
      },
      generateTasks(ctx: PlanningContext) {
        return [
          {
            id: 'custom-task',
            title: 'Custom Work',
            status: TaskStatus.Pending,
            dependsOn: [],
          },
        ];
      },
    };

    const customBuilder = new PlanBuilder([customRule, new LaunchNotepadRule()]);

    const customGoal: Goal = {
      id: 'g-custom',
      instruction: 'Custom Action',
      createdAt: Date.now(),
    };
    const notepadGoal: Goal = {
      id: 'g-np',
      instruction: 'Open Notepad',
      createdAt: Date.now(),
    };
    const captureGoal: Goal = {
      id: 'g-cap',
      instruction: 'Capture Screen',
      createdAt: Date.now(),
    };

    expect(customBuilder.build({ goal: customGoal }).tasks).toHaveLength(1);
    expect(customBuilder.build({ goal: notepadGoal }).tasks).toHaveLength(1);
    // Capture rule is not present in customBuilder, so should return empty
    expect(customBuilder.build({ goal: captureGoal }).tasks).toEqual([]);
  });

  it('Public exports', async () => {
    const planner = await import('../src');

    expect(planner.PlanBuilder).toBeDefined();
    expect(planner.LaunchNotepadRule).toBeDefined();
    expect(planner.CaptureScreenRule).toBeDefined();
    expect(planner.ReadScreenRule).toBeDefined();
    expect(planner.CopyTextRule).toBeDefined();
    expect(planner.ListWindowsRule).toBeDefined();
  });
});
