import { ExecutionPlan } from '../plans/ExecutionPlan';

export type GoalCategory = 'browser' | 'desktop' | 'coding' | 'system' | 'general';

export interface AnalyzedGoal {
  rawGoal: string;
  category: GoalCategory;
  primaryAction: string;
  subGoals: string[];
  targetApp?: string;
  targetDomain?: string;
  isSensitive: boolean;
  sensitivityReason?: string;
  language: 'tr' | 'en';
}

export interface ActionCapability {
  action: string;
  category: GoalCategory;
  description: string;
  isSensitive?: boolean;
  requiresApp?: string;
  requiresBrowser?: boolean;
}

export interface ReasoningContext {
  currentApplication?: string | null;
  currentBrowser?: { browserName: string; currentUrl?: string } | null;
  currentWindow?: { id?: string; title: string; processName?: string } | null;
  currentDomSnapshot?: unknown | null;
  currentLanguage?: 'tr' | 'en';
}

export interface ConversationContextLike {
  currentApplication?(): string | null;
  currentWindow?(): { id?: string; title: string; processName?: string } | null;
  currentBrowser?(): { browserName: string; currentUrl?: string } | null;
  currentDomSnapshot?(): unknown | null;
  lastVisionResult?(): { ocrLines?: string[]; detectedText?: string; timestamp?: number } | null;
  lastExecutionPlan?(): unknown | null;
  lastExecutedAction?(): unknown | null;
  currentLanguage?(): 'tr' | 'en';
}

export interface Strategy {
  goal: string;
  steps: ExecutionPlan[];
  confidence: number;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  recoveryPlan?: ExecutionPlan;
  toUnifiedPlan(): ExecutionPlan;
}

export interface StepCandidate {
  action: string;
  parameters: Record<string, unknown>;
  phase: 'precondition' | 'execution' | 'verification';
  isSensitive?: boolean;
  sensitivityReason?: string;
}

export interface ToolDescriptorLike {
  id: string;
  name: string;
  description?: string;
  category: string;
  parameters?: Record<string, unknown>;
  permissions?: string[];
  confirmationRequired?: boolean;
  capabilities?: string[];
  tags?: string[];
}

export interface ToolRegistryLike {
  list(): ToolDescriptorLike[];
  find(id: string): unknown | undefined;
  findByCategory(category: string): unknown[];
  findByCapability?(capability: string): unknown[];
}

