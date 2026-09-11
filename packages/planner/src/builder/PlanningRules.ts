import { Task } from '../model/Task';
import { TaskStatus } from '../model/TaskStatus';
import { PlanningContext } from './PlanningContext';
import { IntentRecognizer } from '../nlu/IntentRecognizer';

export interface PlanningRule {
  matches(context: PlanningContext): boolean;
  generateTasks(context: PlanningContext): Task[];
}

const defaultRecognizer = new IntentRecognizer();

export class LaunchNotepadRule implements PlanningRule {
  matches(context: PlanningContext): boolean {
    const norm = context.goal.instruction.trim().toLowerCase();
    return norm === 'open notepad' || norm === 'notepad' || norm === 'notepad aç';
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
    const intent = defaultRecognizer.recognize(context.goal.instruction);
    return intent.name === 'CAPTURE_SCREEN';
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
    const intent = defaultRecognizer.recognize(context.goal.instruction);
    return intent.name === 'READ_SCREEN';
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

export class OpenApplicationRule implements PlanningRule {
  matches(context: PlanningContext): boolean {
    const intent = defaultRecognizer.recognize(context.goal.instruction);
    return intent.name === 'OPEN_APPLICATION';
  }

  generateTasks(context: PlanningContext): Task[] {
    const intent = defaultRecognizer.recognize(context.goal.instruction);
    const target = (intent.parameters?.target as string) || 'application';
    return [
      {
        id: `${context.goal.id}-task-1`,
        title: 'Launch Application',
        description: `Open ${target} application`,
        status: TaskStatus.Pending,
        dependsOn: [],
      },
    ];
  }
}

export class WindowControlRule implements PlanningRule {
  matches(context: PlanningContext): boolean {
    const intent = defaultRecognizer.recognize(context.goal.instruction);
    return (
      intent.name === 'BRING_TO_FRONT' ||
      intent.name === 'MINIMIZE_WINDOW' ||
      intent.name === 'MAXIMIZE_WINDOW' ||
      intent.name === 'CLOSE_WINDOW'
    );
  }

  generateTasks(context: PlanningContext): Task[] {
    const intent = defaultRecognizer.recognize(context.goal.instruction);
    return [
      {
        id: `${context.goal.id}-task-1`,
        title: 'Window Action',
        description: `Execute ${intent.name} window operation`,
        status: TaskStatus.Pending,
        dependsOn: [],
      },
    ];
  }
}

export class MouseActionRule implements PlanningRule {
  matches(context: PlanningContext): boolean {
    const intent = defaultRecognizer.recognize(context.goal.instruction);
    return intent.name === 'MOVE_MOUSE' || intent.name === 'MOUSE_CLICK';
  }

  generateTasks(context: PlanningContext): Task[] {
    const intent = defaultRecognizer.recognize(context.goal.instruction);
    return [
      {
        id: `${context.goal.id}-task-1`,
        title: 'Mouse Action',
        description: `Execute ${intent.name} mouse operation`,
        status: TaskStatus.Pending,
        dependsOn: [],
      },
    ];
  }
}

export class KeyboardActionRule implements PlanningRule {
  matches(context: PlanningContext): boolean {
    const intent = defaultRecognizer.recognize(context.goal.instruction);
    return (
      intent.name === 'TYPE_TEXT' ||
      intent.name === 'PRESS_KEY' ||
      intent.name === 'KEY_SHORTCUT'
    );
  }

  generateTasks(context: PlanningContext): Task[] {
    const intent = defaultRecognizer.recognize(context.goal.instruction);
    return [
      {
        id: `${context.goal.id}-task-1`,
        title: 'Keyboard Action',
        description: `Execute ${intent.name} keyboard operation`,
        status: TaskStatus.Pending,
        dependsOn: [],
      },
    ];
  }
}

export class ListWindowsRule implements PlanningRule {
  matches(context: PlanningContext): boolean {
    const intent = defaultRecognizer.recognize(context.goal.instruction);
    return intent.name === 'LIST_WINDOWS';
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
  new CopyTextRule(),
  new CaptureScreenRule(),
  new ReadScreenRule(),
  new ListWindowsRule(),
  new OpenApplicationRule(),
  new WindowControlRule(),
  new MouseActionRule(),
  new KeyboardActionRule(),
];
