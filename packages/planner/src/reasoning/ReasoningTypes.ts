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

export interface LongTermMemoryRecordLike {
  id: string;
  category: string;
  title: string;
  content: string;
  tags?: string[];
  importance?: number;
  metadata?: Record<string, unknown>;
}

export interface LongTermMemoryLike {
  recall(query: string, options?: { category?: string }): Promise<LongTermMemoryRecordLike | null> | LongTermMemoryRecordLike | null;
  search?(query: string, options?: { category?: string; limit?: number }): Promise<Array<{ record: LongTermMemoryRecordLike }>> | Array<{ record: LongTermMemoryRecordLike }>;
  find?(filter?: { category?: string }, limit?: number): Promise<LongTermMemoryRecordLike[]> | LongTermMemoryRecordLike[];
}

export interface ReasoningContext {
  currentApplication?: string | null;
  currentBrowser?: { browserName: string; currentUrl?: string } | null;
  currentWindow?: { id?: string; title: string; processName?: string } | null;
  currentDomSnapshot?: unknown | null;
  currentLanguage?: 'tr' | 'en';
  longTermMemory?: LongTermMemoryLike | null;
  preferredBrowser?: string;
  activeProject?: { name: string; path?: string; lastDocument?: string };
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
  longTermMemory?(): LongTermMemoryLike | null;
  preferredBrowser?(): string | undefined;
  activeProject?(): { name: string; path?: string; lastDocument?: string } | undefined;
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

