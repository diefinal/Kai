export interface ActiveWindowContext {
  id?: string;
  title: string;
  processName?: string;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface BrowserTabContext {
  id: string;
  url: string;
  title?: string;
}

export interface BrowserContext {
  browserName: string;
  currentUrl?: string;
  activeTabId?: string;
  tabs?: BrowserTabContext[];
}

export interface VisionContext {
  timestamp: number;
  image?: Uint8Array;
  ocrLines?: string[];
  detectedText?: string;
}

export interface ActionContext {
  action: string;
  parameters: Record<string, unknown>;
  timestamp: number;
  success: boolean;
  output?: unknown;
}

export interface PlanStepContext {
  id: string;
  action: string;
  parameters: Record<string, unknown>;
  dependsOn?: string[];
}

export interface ExecutionPlanContext {
  id: string;
  steps: PlanStepContext[];
  createdAt: number;
}

export interface DomElementContext {
  id: string;
  tag: string;
  role?: string;
  text?: string;
  placeholder?: string;
  ariaLabel?: string;
  selector: string;
  visible: boolean;
  enabled: boolean;
  type?: string;
  name?: string;
  value?: string;
  href?: string;
}

export interface DomSnapshotContext {
  title: string;
  url: string;
  timestamp: number;
  formsCount?: number;
  buttonsCount?: number;
  inputsCount?: number;
  linksCount?: number;
  visibleText?: string;
  elements?: DomElementContext[];
  raw?: unknown;
}

export interface DomQueryContext {
  criteria: Record<string, unknown>;
  timestamp: number;
  matchedCount: number;
}

export interface ConversationContextSnapshot {
  currentApplication: string | null;
  currentWindow: ActiveWindowContext | null;
  currentBrowser: BrowserContext | null;
  currentDomSnapshot: DomSnapshotContext | null;
  lastDomQuery: DomQueryContext | null;
  lastSelectedElement: DomElementContext | null;
  lastVisionResult: VisionContext | null;
  lastExecutionPlan: ExecutionPlanContext | null;
  lastExecutedAction: ActionContext | null;
  currentLanguage: 'tr' | 'en';
  updatedAt: number;
}

export interface IConversationContext {
  currentApplication(): string | null;
  currentWindow(): ActiveWindowContext | null;
  currentBrowser(): BrowserContext | null;
  currentDomSnapshot(): DomSnapshotContext | null;
  lastDomQuery(): DomQueryContext | null;
  lastSelectedElement(): DomElementContext | null;
  lastVisionResult(): VisionContext | null;
  lastExecutionPlan(): ExecutionPlanContext | null;
  lastExecutedAction(): ActionContext | null;
  currentLanguage(): 'tr' | 'en';
  snapshot(): ConversationContextSnapshot;
}
