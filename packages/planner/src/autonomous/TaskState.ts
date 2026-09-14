import { ExecutionPlan } from '../plans/ExecutionPlan';

export type AgentTaskStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed';

export interface AgentTaskStep {
  id: string;
  description: string;
  action: string;
  parameters: Record<string, unknown>;
  completed: boolean;
  requiresConfirmation?: boolean;
  result?: unknown;
  error?: string;
}

export interface AgentTask {
  id: string;
  goal: string;
  status: AgentTaskStatus;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  nextAction?: ExecutionPlan;
  steps: AgentTaskStep[];
  currentStepIndex: number;
  waitingReason?: string;
  interruptedAt?: Date;
  metadata?: Record<string, unknown>;
  historySummary?: string[];
}
