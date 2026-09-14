import { BrowserManager } from './BrowserManager';
import { BrowserSession } from './BrowserSession';
import { BrowserTab } from './BrowserTab';
import {
  BrowserError,
  BrowserLaunchOptions,
  BrowserType,
  IBrowserTab,
  TabInfo,
} from './BrowserTypes';
import { BrowserFactory } from './BrowserFactory';
import { IPlaywrightProvider } from './BrowserTypes';
import { DefaultPlaywrightProvider } from './PlaywrightProvider';
import { DomEngine } from './dom/DomEngine';
import { DomQueryCriteria } from './dom/DomQuery';
import { AutomationEngine } from './automation/AutomationEngine';

export class BrowserEngine {
  private readonly manager: BrowserManager;
  private readonly domEngine: DomEngine;
  private readonly automationEngine: AutomationEngine;

  constructor(
    provider: IPlaywrightProvider = new DefaultPlaywrightProvider(),
    domEngine: DomEngine = new DomEngine(),
    automationEngine: AutomationEngine = new AutomationEngine(domEngine)
  ) {
    const factory = new BrowserFactory(provider);
    this.manager = new BrowserManager(factory);
    this.domEngine = domEngine;
    this.automationEngine = automationEngine;
  }

  getManager(): BrowserManager {
    return this.manager;
  }

  getDomEngine(): DomEngine {
    return this.domEngine;
  }

  getAutomation(): AutomationEngine {
    return this.automationEngine;
  }


  async launch(
    browserType: BrowserType = 'chrome',
    options?: BrowserLaunchOptions
  ): Promise<BrowserSession> {
    return this.manager.createSession(browserType, options);
  }

  private async ensureSession(sessionId?: string): Promise<BrowserSession> {
    const session = this.manager.getSession(sessionId);
    if (session) return session;
    return this.manager.createSession('chrome');
  }

  async navigate(url: string, sessionId?: string): Promise<string> {
    const session = await this.ensureSession(sessionId);
    let tab = session.activeTab() as BrowserTab | null;
    if (!tab) {
      tab = (await session.newTab()) as BrowserTab;
    }
    return tab.navigate(url);
  }

  async newTab(url?: string, sessionId?: string): Promise<IBrowserTab> {
    const session = await this.ensureSession(sessionId);
    return session.newTab(url);
  }

  async closeTab(tabId?: string, sessionId?: string): Promise<void> {
    const session = await this.ensureSession(sessionId);
    return session.closeTab(tabId);
  }

  async switchTab(tabId: string, sessionId?: string): Promise<IBrowserTab> {
    const session = await this.ensureSession(sessionId);
    return session.switchTab(tabId);
  }

  async reload(sessionId?: string): Promise<void> {
    const session = await this.ensureSession(sessionId);
    const tab = session.activeTab();
    if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab to reload.');
    return tab.reload();
  }

  async back(sessionId?: string): Promise<boolean> {
    const session = await this.ensureSession(sessionId);
    const tab = session.activeTab();
    if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab to navigate back.');
    return tab.back();
  }

  async forward(sessionId?: string): Promise<boolean> {
    const session = await this.ensureSession(sessionId);
    const tab = session.activeTab();
    if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab to navigate forward.');
    return tab.forward();
  }

  async currentUrl(sessionId?: string): Promise<string> {
    const session = await this.ensureSession(sessionId);
    const tab = session.activeTab();
    if (!tab) return 'about:blank';
    return tab.currentUrl();
  }

  async listTabs(sessionId?: string): Promise<TabInfo[]> {
    const session = await this.ensureSession(sessionId);
    return session.listTabs();
  }

  activeTab(sessionId?: string): IBrowserTab | null {
    const session = this.manager.getSession(sessionId);
    return session ? session.activeTab() : null;
  }

  async reconnect(sessionId?: string): Promise<void> {
    const session = await this.ensureSession(sessionId);
    return session.reconnect();
  }

  async close(sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.manager.closeSession(sessionId);
    } else {
      await this.manager.closeAll();
    }
  }

  /**
   * Action executor for Execution Engine actions
   */
  async executeAction(
    action: string,
    parameters: Record<string, unknown> = {}
  ): Promise<unknown> {
    const norm = action.toUpperCase();
    const sessionId = parameters.sessionId as string | undefined;

    switch (norm) {
      case 'OPEN_BROWSER': {
        const browser = (parameters.target as string) || (parameters.browser as string) || 'chrome';
        const type: BrowserType = browser.toLowerCase().includes('edge') ? 'edge' : 'chrome';
        const session = await this.launch(type);
        return { sessionId: session.id, browserType: session.browserType };
      }

      case 'NAVIGATE': {
        const url = (parameters.url as string) || '';
        const resUrl = await this.navigate(url, sessionId);
        return { url: resUrl };
      }

      case 'NEW_TAB': {
        const url = parameters.url as string | undefined;
        const tab = await this.newTab(url, sessionId);
        return { tabId: tab.id, url: await tab.currentUrl() };
      }

      case 'CLOSE_TAB': {
        const tabId = parameters.tabId as string | undefined;
        await this.closeTab(tabId, sessionId);
        return { success: true };
      }

      case 'SWITCH_TAB': {
        const tabId = (parameters.tabId as string) || '';
        const tab = await this.switchTab(tabId, sessionId);
        return { tabId: tab.id, url: await tab.currentUrl() };
      }

      case 'RELOAD_PAGE': {
        await this.reload(sessionId);
        return { success: true };
      }

      case 'BACK': {
        const ok = await this.back(sessionId);
        return { success: ok };
      }

      case 'FORWARD': {
        const ok = await this.forward(sessionId);
        return { success: ok };
      }

      case 'GET_CURRENT_URL': {
        const url = await this.currentUrl(sessionId);
        return { url };
      }

      case 'READ_DOM': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available for DOM read.');
        const snapshot = await this.domEngine.readDom(tab);
        return { snapshot };
      }

      case 'QUERY_DOM': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available for DOM query.');
        const criteria: DomQueryCriteria = {
          text: parameters.text as string | undefined,
          role: parameters.role as string | undefined,
          tag: parameters.tag as string | undefined,
          placeholder: parameters.placeholder as string | undefined,
          ariaLabel: (parameters.ariaLabel || parameters['aria-label']) as string | undefined,
          selector: parameters.selector as string | undefined,
          type: parameters.type as string | undefined,
          name: parameters.name as string | undefined,
          visibleOnly: parameters.visibleOnly !== false,
        };
        const elements = await this.domEngine.queryDom(tab, criteria);
        return { elements, count: elements.length, query: criteria };
      }

      case 'GET_FORMS': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available.');
        const forms = await this.domEngine.getForms(tab);
        return { forms, count: forms.length };
      }

      case 'GET_BUTTONS': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available.');
        const buttons = await this.domEngine.getButtons(tab);
        return { buttons, count: buttons.length };
      }

      case 'GET_INPUTS': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available.');
        const inputs = await this.domEngine.getInputs(tab);
        return { inputs, count: inputs.length };
      }

      case 'GET_LINKS': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available.');
        const links = await this.domEngine.getLinks(tab);
        return { links, count: links.length };
      }

      case 'GET_VISIBLE_TEXT': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available.');
        const text = await this.domEngine.getVisibleText(tab);
        return { text };
      }

      case 'CLICK_BUTTON':
      case 'CLICK_LINK':
      case 'CLICK_ELEMENT': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available.');
        const criteria = {
          text: parameters.text as string | undefined,
          role:
            (parameters.role as string) ||
            (norm === 'CLICK_BUTTON' ? 'button' : norm === 'CLICK_LINK' ? 'link' : undefined),
          selector: parameters.selector as string | undefined,
          ariaLabel: (parameters.ariaLabel || parameters['aria-label']) as string | undefined,
          placeholder: parameters.placeholder as string | undefined,
        };
        return this.automationEngine.click(tab, criteria);
      }

      case 'FILL_INPUT':
      case 'FILL_TEXTAREA':
      case 'TYPE_TEXT': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available.');
        const value = (parameters.value as string) ?? (parameters.text as string) ?? '';
        const criteria = {
          name: parameters.name as string | undefined,
          placeholder: parameters.placeholder as string | undefined,
          selector: parameters.selector as string | undefined,
          type: parameters.type as string | undefined,
          text: (parameters.label as string) || (parameters.placeholder as string),
        };
        return this.automationEngine.fill(tab, criteria, value);
      }

      case 'SELECT_OPTION': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available.');
        const value = (parameters.value as string) || (parameters.option as string) || '';
        return this.automationEngine.select(tab, { selector: parameters.selector as string }, value);
      }

      case 'CHECK_CHECKBOX': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available.');
        const checked = parameters.checked !== false;
        return this.automationEngine.check(tab, { selector: parameters.selector as string }, checked);
      }

      case 'SUBMIT_FORM': {
        const session = await this.ensureSession(sessionId);
        const tab = session.activeTab();
        if (!tab) throw new BrowserError('TAB_NOT_FOUND', 'No active tab available.');
        return this.automationEngine.submitForm(tab, parameters.form as string | undefined);
      }

      default:
        throw new BrowserError('DRIVER_ERROR', `Unknown browser action: "${action}"`);
    }
  }
}

