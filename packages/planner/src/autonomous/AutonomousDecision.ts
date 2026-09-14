import { ExecutionPlan } from '../plans/ExecutionPlan';

export type DecisionType =
  | 'EXECUTE_NEXT'
  | 'REQUEST_CONFIRMATION'
  | 'AWAIT_EXTERNAL'
  | 'TASK_COMPLETED'
  | 'TASK_BLOCKED';

export interface AutonomousDecision {
  taskId: string;
  type: DecisionType;
  plan?: ExecutionPlan;
  proposalMessage?: string;
  requiresUserConfirmation: boolean;
  confidence: number;
  reason: string;
}

export class SafetyValidator {
  private static readonly CONFIRMATION_ACTIONS = new Set([
    'SEND_MAIL',
    'REPLY_MAIL',
    'MERGE_PR',
    'CONFIRM_MERGE',
    'DELETE_FILE',
    'DELETE_FOLDER',
    'REMOVE_PATH',
    'CLOSE_APPLICATION',
    'TERMINATE_PROCESS',
    'SYSTEM_SHUTDOWN',
    'SYSTEM_RESTART',
  ]);

  private static readonly DESTRUCTIVE_CMD_PATTERNS = [
    /\brm\s+(-rf?|-fr)\b/i,
    /\bdel\s+(\/f|\/s|\/q)\b/i,
    /\brmdir\s+\/s\b/i,
    /\bformat\s+[a-z]:/i,
    /\bdrop\s+database\b/i,
    /\bgit\s+reset\s+--hard\b/i,
    /\bgit\s+push\s+.*--force\b/i,
    /\bgit\s+clean\s+-fdx?\b/i,
  ];

  static requiresConfirmation(action: string, parameters: Record<string, unknown> = {}): boolean {
    const normAction = action.toUpperCase();

    if (this.CONFIRMATION_ACTIONS.has(normAction)) {
      return true;
    }

    if (normAction.includes('DELETE') || normAction.includes('MERGE') || normAction.includes('SHUTDOWN')) {
      return true;
    }

    if (normAction === 'RUN_COMMAND' || normAction === 'EXECUTE_COMMAND') {
      const command = String(parameters.command || parameters.cmd || '');
      for (const pattern of this.DESTRUCTIVE_CMD_PATTERNS) {
        if (pattern.test(command)) {
          return true;
        }
      }
    }

    return false;
  }

  static getConfirmationPrompt(action: string, parameters: Record<string, unknown>, language: 'tr' | 'en' = 'tr'): string {
    const norm = action.toUpperCase();
    if (language === 'tr') {
      if (norm === 'MERGE_PR' || norm.includes('MERGE')) {
        return 'Pull request merge edilmeye hazır. Onaylıyor musun?';
      }
      if (norm === 'SEND_MAIL' || norm.includes('MAIL')) {
        return 'Mail gönderilmeye hazır. Göndermemi onaylıyor musun?';
      }
      if (norm.includes('DELETE')) {
        return 'Silme işlemi gerçekleştirilecek. Devam etmek istiyor musun?';
      }
      if (norm.includes('CLOSE')) {
        return 'Uygulama kapatılacak. Devam edilsin mi?';
      }
      return `"${action}" eylemi yüksek etkili bir işlemdir. Onaylıyor musunuz?`;
    }

    if (norm === 'MERGE_PR' || norm.includes('MERGE')) {
      return 'Pull request is ready to be merged. Do you approve?';
    }
    if (norm === 'SEND_MAIL' || norm.includes('MAIL')) {
      return 'Email is ready to be sent. Do you approve?';
    }
    if (norm.includes('DELETE')) {
      return 'A delete operation is about to be executed. Do you want to proceed?';
    }
    return `Action "${action}" is high impact. Do you want to proceed?`;
  }
}
