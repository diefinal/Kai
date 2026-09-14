import { ConversationContext } from './ConversationContext';
import {
  ActiveWindowContext,
  ExecutionPlanContext,
  VisionContext,
  DomSnapshotContext,
  DomElementContext,
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

    if (normAction === 'OPEN_APPLICATION' || normAction === 'OPEN_BROWSER') {
      const target =
        (parameters.target as string) ||
        (parameters.browser as string) ||
        (parameters.appName as string) ||
        'chrome';
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

      const existingTabs = this.context.currentBrowser()?.tabs || [];
      const currentTab = existingTabs.length > 0 ? existingTabs[0] : { id: 'tab-1', url };
      currentTab.url = url;

      this.context.setCurrentBrowser({
        browserName,
        currentUrl: url,
        activeTabId: currentTab.id,
        tabs: existingTabs.length > 0 ? existingTabs : [currentTab],
      });
      this.context.setCurrentApplication(browserName);
    } else if (normAction === 'NEW_TAB') {
      const browser = this.context.currentBrowser() || { browserName: 'chrome', tabs: [] };
      const tabId = (output as any)?.tabId || `tab-${(browser.tabs?.length || 0) + 1}`;
      const url = (parameters.url as string) || (output as any)?.url || 'about:blank';
      const updatedTabs = [...(browser.tabs || []), { id: tabId, url }];
      this.context.setCurrentBrowser({
        ...browser,
        activeTabId: tabId,
        currentUrl: url,
        tabs: updatedTabs,
      });
    } else if (normAction === 'CLOSE_TAB') {
      const browser = this.context.currentBrowser();
      if (browser && browser.tabs) {
        const tabId = (parameters.tabId as string) || browser.activeTabId;
        const remainingTabs = browser.tabs.filter((t) => t.id !== tabId);
        const nextActive =
          remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : undefined;
        this.context.setCurrentBrowser({
          ...browser,
          activeTabId: nextActive?.id,
          currentUrl: nextActive?.url,
          tabs: remainingTabs,
        });
      }
    } else if (normAction === 'SWITCH_TAB') {
      const browser = this.context.currentBrowser();
      if (browser) {
        const tabId = (parameters.tabId as string) || (output as any)?.tabId;
        const targetTab = browser.tabs?.find((t) => t.id === tabId);
        this.context.setCurrentBrowser({
          ...browser,
          activeTabId: tabId,
          currentUrl: targetTab?.url || browser.currentUrl,
        });
      }
    } else if (
      normAction === 'BACK' ||
      normAction === 'FORWARD' ||
      normAction === 'GET_CURRENT_URL'
    ) {
      const browser = this.context.currentBrowser();
      const url = (output as any)?.url;
      if (browser && url) {
        this.context.setCurrentBrowser({
          ...browser,
          currentUrl: url,
        });
      }
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
    } else if (normAction === 'READ_DOM') {
      const snapshot = (output as any)?.snapshot || (output as any);
      if (snapshot && typeof snapshot === 'object') {
        this.recordDomSnapshot({
          title: snapshot.title || '',
          url: snapshot.url || '',
          timestamp: snapshot.timestamp || Date.now(),
          formsCount: Array.isArray(snapshot.forms) ? snapshot.forms.length : undefined,
          buttonsCount: Array.isArray(snapshot.buttons) ? snapshot.buttons.length : undefined,
          inputsCount: Array.isArray(snapshot.inputs) ? snapshot.inputs.length : undefined,
          linksCount: Array.isArray(snapshot.links) ? snapshot.links.length : undefined,
          visibleText: snapshot.visibleText,
          elements: Array.isArray(snapshot.elements) ? snapshot.elements : undefined,
          raw: snapshot,
        });
      }
    } else if (normAction === 'QUERY_DOM') {
      const elements = (output as any)?.elements || (Array.isArray(output) ? output : []);
      const count = typeof (output as any)?.count === 'number' ? (output as any).count : elements.length;
      this.recordDomQuery(parameters, count, elements[0]);
    } else if (
      normAction === 'GET_BUTTONS' ||
      normAction === 'GET_INPUTS' ||
      normAction === 'GET_LINKS' ||
      normAction === 'GET_FORMS'
    ) {
      const items =
        (output as any)?.buttons ||
        (output as any)?.inputs ||
        (output as any)?.links ||
        (output as any)?.forms ||
        (Array.isArray(output) ? output : []);
      if (items.length > 0 && typeof items[0] === 'object') {
        this.context.setLastSelectedElement(items[0]);
      }
    }
  }

  recordDomSnapshot(snapshot: DomSnapshotContext): void {
    this.context.setCurrentDomSnapshot(snapshot);
  }

  recordDomQuery(
    criteria: Record<string, unknown>,
    matchedCount: number,
    selectedElement?: DomElementContext
  ): void {
    this.context.setLastDomQuery({
      criteria,
      timestamp: Date.now(),
      matchedCount,
    });
    if (selectedElement) {
      this.context.setLastSelectedElement(selectedElement);
    }
  }

  recordSelectedElement(element: DomElementContext): void {
    this.context.setLastSelectedElement(element);
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
