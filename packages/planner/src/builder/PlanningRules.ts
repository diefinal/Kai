import { Task } from '../model/Task';
import { TaskStatus } from '../model/TaskStatus';
import { PlanningContext } from './PlanningContext';

export interface PlanningRule {
  matches(context: PlanningContext): boolean;
  generateTasks(context: PlanningContext): Task[];
}

export class LaunchNotepadRule implements PlanningRule {
  matches(context: PlanningContext): boolean {
    return context.goal.instruction.trim().toLowerCase() === 'open notepad';
  }

  generateTasks(context: PlanningContext): Task[] {
    return [
      {
        id: `${context.goal.id}-task-1`,
        title: 'Launch Application',
        description: 'Open Notepad application',
        status: TaskStatus.Pending,
        dependsOn: [],
      },
    ];
  }
}

export class CaptureScreenRule implements PlanningRule {
  matches(context: PlanningContext): boolean {
    return context.goal.instruction.trim().toLowerCase() === 'capture screen';
  }

  generateTasks(context: PlanningContext): Task[] {
    return [
      {
        id: `${context.goal.id}-task-1`,
        title: 'Capture Screen',
        description: 'Capture active screen buffer',
        status: TaskStatus.Pending,
        dependsOn: [],
      },
    ];
  }
}

export class ReadScreenRule implements PlanningRule {
  matches(context: PlanningContext): boolean {
    return context.goal.instruction.trim().toLowerCase() === 'read screen';
  }

  generateTasks(context: PlanningContext): Task[] {
    const task1Id = `${context.goal.id}-task-1`;
    const task2Id = `${context.goal.id}-task-2`;
    return [
      {
        id: task1Id,
        title: 'Capture Screen',
        description: 'Capture active screen buffer for OCR analysis',
        status: TaskStatus.Pending,
        dependsOn: [],
      },
      {
        id: task2Id,
        title: 'OCR',
        description: 'Recognize text from captured screen frame',
        status: TaskStatus.Pending,
        dependsOn: [task1Id],
      },
    ];
  }
}

export class CopyTextRule implements PlanningRule {
  matches(context: PlanningContext): boolean {
    return context.goal.instruction.trim().toLowerCase() === 'copy text';
  }

  generateTasks(context: PlanningContext): Task[] {
    const task1Id = `${context.goal.id}-task-1`;
    const task2Id = `${context.goal.id}-task-2`;
    const task3Id = `${context.goal.id}-task-3`;
    return [
      {
        id: task1Id,
        title: 'Capture',
        description: 'Capture screen buffer',
        status: TaskStatus.Pending,
        dependsOn: [],
      },
      {
        id: task2Id,
        title: 'OCR',
        description: 'Extract text via OCR engine',
        status: TaskStatus.Pending,
        dependsOn: [task1Id],
      },
      {
        id: task3Id,
        title: 'Clipboard',
        description: 'Write recognized text to system clipboard',
        status: TaskStatus.Pending,
        dependsOn: [task2Id],
      },
    ];
  }
}

export class ListWindowsRule implements PlanningRule {
  matches(context: PlanningContext): boolean {
    return context.goal.instruction.trim().toLowerCase() === 'list windows';
  }

  generateTasks(context: PlanningContext): Task[] {
    return [
      {
        id: `${context.goal.id}-task-1`,
        title: 'Get Windows',
        description: 'Enumerate open system windows',
        status: TaskStatus.Pending,
        dependsOn: [],
      },
    ];
  }
}

export const defaultPlanningRules: PlanningRule[] = [
  new LaunchNotepadRule(),
  new CaptureScreenRule(),
  new ReadScreenRule(),
  new CopyTextRule(),
  new ListWindowsRule(),
];
