import {
  ActiveWindowContext,
  BrowserContext,
  VisionContext,
  ActionContext,
  ExecutionPlanContext,
  ConversationContextSnapshot,
  IConversationContext,
} from './ContextTypes';

export class ConversationContext implements IConversationContext {
  private _currentApplication: string | null = null;
  private _currentWindow: ActiveWindowContext | null = null;
  private _currentBrowser: BrowserContext | null = null;
  private _lastVisionResult: VisionContext | null = null;
  private _lastExecutionPlan: ExecutionPlanContext | null = null;
  private _lastExecutedAction: ActionContext | null = null;
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

  lastVisionResult(): VisionContext | null {
    return this._lastVisionResult;
  }

  lastExecutionPlan(): ExecutionPlanContext | null {
    return this._lastExecutionPlan;
  }

  lastExecutedAction(): ActionContext | null {
    return this._lastExecutedAction;
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

  setCurrentLanguage(lang: 'tr' | 'en'): this {
    this._currentLanguage = lang;
    this._updatedAt = Date.now();
    return this;
  }

  clear(): void {
    this._currentApplication = null;
    this._currentWindow = null;
    this._currentBrowser = null;
    this._lastVisionResult = null;
    this._lastExecutionPlan = null;
    this._lastExecutedAction = null;
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
      currentLanguage: this._currentLanguage,
      updatedAt: this._updatedAt,
    };
  }
}
