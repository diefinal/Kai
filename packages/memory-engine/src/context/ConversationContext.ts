import {
  ActiveWindowContext,
  BrowserContext,
  VisionContext,
  ActionContext,
  ExecutionPlanContext,
  ConversationContextSnapshot,
  IConversationContext,
  DomSnapshotContext,
  DomQueryContext,
  DomElementContext,
  VerificationContextSnapshot,
} from './ContextTypes';

export class ConversationContext implements IConversationContext {
  private _currentApplication: string | null = null;
  private _currentWindow: ActiveWindowContext | null = null;
  private _currentBrowser: BrowserContext | null = null;
  private _currentDomSnapshot: DomSnapshotContext | null = null;
  private _lastDomQuery: DomQueryContext | null = null;
  private _lastSelectedElement: DomElementContext | null = null;
  private _lastVisionResult: VisionContext | null = null;
  private _lastExecutionPlan: ExecutionPlanContext | null = null;
  private _lastExecutedAction: ActionContext | null = null;
  private _lastSuccessfulAction: ActionContext | null = null;
  private _lastVerification: VerificationContextSnapshot | null = null;
  private _failureReason: string | null = null;
  private _retryCount: number = 0;
  private _currentLanguage: 'tr' | 'en' = 'tr';
  private _updatedAt: number = Date.now();


  currentApplication(): string | null {
    return this._currentApplication;
  }

  currentWindow(): ActiveWindowContext | null {
    return this._currentWindow;
  }

  currentBrowser(): BrowserContext | null {
    return this._currentBrowser;
  }

  currentDomSnapshot(): DomSnapshotContext | null {
    return this._currentDomSnapshot;
  }

  lastDomQuery(): DomQueryContext | null {
    return this._lastDomQuery;
  }

  lastSelectedElement(): DomElementContext | null {
    return this._lastSelectedElement;
  }

  lastVisionResult(): VisionContext | null {
    return this._lastVisionResult;
  }

  lastExecutionPlan(): ExecutionPlanContext | null {
    return this._lastExecutionPlan;
  }

  lastExecutedAction(): ActionContext | null {
    return this._lastExecutedAction;
  }

  lastSuccessfulAction(): ActionContext | null {
    return this._lastSuccessfulAction;
  }

  lastVerification(): VerificationContextSnapshot | null {
    return this._lastVerification;
  }

  failureReason(): string | null {
    return this._failureReason;
  }

  retryCount(): number {
    return this._retryCount;
  }

  currentLanguage(): 'tr' | 'en' {
    return this._currentLanguage;
  }


  setCurrentApplication(app: string | null): this {
    this._currentApplication = app;
    this._updatedAt = Date.now();
    return this;
  }

  setCurrentWindow(win: ActiveWindowContext | null): this {
    this._currentWindow = win;
    if (win?.processName && !this._currentApplication) {
      this._currentApplication = win.processName;
    }
    this._updatedAt = Date.now();
    return this;
  }

  setCurrentBrowser(browser: BrowserContext | null): this {
    this._currentBrowser = browser;
    if (browser?.browserName) {
      this._currentApplication = browser.browserName;
    }
    this._updatedAt = Date.now();
    return this;
  }

  setCurrentDomSnapshot(snapshot: DomSnapshotContext | null): this {
    this._currentDomSnapshot = snapshot;
    this._updatedAt = Date.now();
    return this;
  }

  setLastDomQuery(query: DomQueryContext | null): this {
    this._lastDomQuery = query;
    this._updatedAt = Date.now();
    return this;
  }

  setLastSelectedElement(element: DomElementContext | null): this {
    this._lastSelectedElement = element;
    this._updatedAt = Date.now();
    return this;
  }

  setLastVisionResult(vision: VisionContext | null): this {
    this._lastVisionResult = vision;
    this._updatedAt = Date.now();
    return this;
  }

  setLastExecutionPlan(plan: ExecutionPlanContext | null): this {
    this._lastExecutionPlan = plan;
    this._updatedAt = Date.now();
    return this;
  }

  setLastExecutedAction(action: ActionContext | null): this {
    this._lastExecutedAction = action;
    this._updatedAt = Date.now();
    return this;
  }

  setLastSuccessfulAction(action: ActionContext | null): this {
    this._lastSuccessfulAction = action;
    this._updatedAt = Date.now();
    return this;
  }

  setLastVerification(verification: VerificationContextSnapshot | null): this {
    this._lastVerification = verification;
    this._updatedAt = Date.now();
    return this;
  }

  setFailureReason(reason: string | null): this {
    this._failureReason = reason;
    this._updatedAt = Date.now();
    return this;
  }

  setRetryCount(count: number): this {
    this._retryCount = count;
    this._updatedAt = Date.now();
    return this;
  }

  setCurrentLanguage(lang: 'tr' | 'en'): this {
    this._currentLanguage = lang;
    this._updatedAt = Date.now();
    return this;
  }

  clear(): void {
    this._currentApplication = null;
    this._currentWindow = null;
    this._currentBrowser = null;
    this._currentDomSnapshot = null;
    this._lastDomQuery = null;
    this._lastSelectedElement = null;
    this._lastVisionResult = null;
    this._lastExecutionPlan = null;
    this._lastExecutedAction = null;
    this._lastSuccessfulAction = null;
    this._lastVerification = null;
    this._failureReason = null;
    this._retryCount = 0;
    this._currentLanguage = 'tr';
    this._updatedAt = Date.now();
  }

  snapshot(): ConversationContextSnapshot {
    return {
      currentApplication: this._currentApplication,
      currentWindow: this._currentWindow ? { ...this._currentWindow } : null,
      currentBrowser: this._currentBrowser
        ? {
            ...this._currentBrowser,
            tabs: this._currentBrowser.tabs ? [...this._currentBrowser.tabs] : undefined,
          }
        : null,
      currentDomSnapshot: this._currentDomSnapshot
        ? {
            ...this._currentDomSnapshot,
            elements: this._currentDomSnapshot.elements
              ? [...this._currentDomSnapshot.elements]
              : undefined,
          }
        : null,
      lastDomQuery: this._lastDomQuery ? { ...this._lastDomQuery } : null,
      lastSelectedElement: this._lastSelectedElement ? { ...this._lastSelectedElement } : null,
      lastVisionResult: this._lastVisionResult ? { ...this._lastVisionResult } : null,
      lastExecutionPlan: this._lastExecutionPlan
        ? {
            ...this._lastExecutionPlan,
            steps: this._lastExecutionPlan.steps.map((s) => ({ ...s })),
          }
        : null,
      lastExecutedAction: this._lastExecutedAction
        ? {
            ...this._lastExecutedAction,
            parameters: { ...this._lastExecutedAction.parameters },
          }
        : null,
      lastSuccessfulAction: this._lastSuccessfulAction
        ? {
            ...this._lastSuccessfulAction,
            parameters: { ...this._lastSuccessfulAction.parameters },
          }
        : null,
      lastVerification: this._lastVerification ? { ...this._lastVerification } : null,
      failureReason: this._failureReason,
      retryCount: this._retryCount,
      currentLanguage: this._currentLanguage,
      updatedAt: this._updatedAt,
    };
  }
}
