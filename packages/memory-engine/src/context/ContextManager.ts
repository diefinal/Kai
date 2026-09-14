import { ConversationContext } from './ConversationContext';
import {
  ActiveWindowContext,
  ExecutionPlanContext,
  VisionContext,
} from './ContextTypes';

export class ContextManager {
  private readonly context: ConversationContext;

  constructor(initialContext?: ConversationContext) {
    this.context = initialContext || new ConversationContext();
  }

  getContext(): ConversationContext {
    return this.context;
  }

  reset(): void {
    this.context.clear();
  }

  recordAction(
    action: string,
    parameters: Record<string, unknown> = {},
    success = true,
    output?: unknown
  ): void {
    this.context.setLastExecutedAction({
      action,
      parameters,
      timestamp: Date.now(),
      success,
      output,
    });

    if (!success) return;

    const normAction = action.toUpperCase();

    if (normAction === 'OPEN_APPLICATION') {
      const target = (parameters.target as string) || (parameters.appName as string) || '';
      const normTarget = target.toLowerCase();
      this.context.setCurrentApplication(normTarget);

      if (normTarget === 'chrome' || normTarget === 'edge') {
        const browser = this.context.currentBrowser() || { browserName: normTarget };
        browser.browserName = normTarget;
        this.context.setCurrentBrowser(browser);
      }

      const appTitleMap: Record<string, string> = {
        vscode: 'Visual Studio Code',
        chrome: 'Google Chrome',
        edge: 'Microsoft Edge',
        notepad: 'Notepad',
        explorer: 'File Explorer',
      };
      this.context.setCurrentWindow({
        title: appTitleMap[normTarget] || target,
        processName: normTarget,
      });
    } else if (normAction === 'NAVIGATE') {
      const url = (parameters.url as string) || '';
      const browserName =
        (parameters.browser as string) ||
        this.context.currentBrowser()?.browserName ||
        (this.context.currentApplication() === 'chrome' || this.context.currentApplication() === 'edge'
          ? this.context.currentApplication()!
          : 'chrome');

      this.context.setCurrentBrowser({
        browserName,
        currentUrl: url,
        activeTabId: 'tab-1',
        tabs: [{ id: 'tab-1', url }],
      });
      this.context.setCurrentApplication(browserName);
    } else if (normAction === 'READ_SCREEN' || normAction === 'CAPTURE_SCREEN') {
      const ocrLines = Array.isArray(output) ? (output as string[]) : [];
      this.context.setLastVisionResult({
        timestamp: Date.now(),
        ocrLines,
        detectedText: ocrLines.join('\n'),
      });
    } else if (
      normAction === 'BRING_TO_FRONT' ||
      normAction === 'MAXIMIZE_WINDOW' ||
      normAction === 'MINIMIZE_WINDOW'
    ) {
      const target = (parameters.target as string) || '';
      if (target) {
        this.context.setCurrentApplication(target);
        this.context.setCurrentWindow({
          title: target,
          processName: target,
        });
      }
    }
  }

  recordExecutionPlan(plan: ExecutionPlanContext): void {
    this.context.setLastExecutionPlan(plan);
  }

  recordWindow(win: ActiveWindowContext): void {
    this.context.setCurrentWindow(win);
  }

  recordVision(vision: VisionContext): void {
    this.context.setLastVisionResult(vision);
  }
}
