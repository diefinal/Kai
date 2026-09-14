import { BrowserTab } from './BrowserTab';
import {
  BrowserError,
  BrowserLaunchOptions,
  BrowserType,
  IBrowserSession,
  IBrowserTab,
  IPlaywrightBrowserHandle,
  IPlaywrightContextHandle,
  IPlaywrightProvider,
  SessionInfo,
  TabInfo,
} from './BrowserTypes';

export class BrowserSession implements IBrowserSession {
  private tabs = new Map<string, BrowserTab>();
  private activeTabId: string | null = null;
  private contextHandle: IPlaywrightContextHandle | null = null;

  constructor(
    public readonly id: string,
    public readonly browserType: BrowserType,
    private browserHandle: IPlaywrightBrowserHandle,
    private readonly provider: IPlaywrightProvider,
    private readonly launchOptions: BrowserLaunchOptions = {}
  ) {}

  async init(): Promise<this> {
    this.contextHandle = await this.browserHandle.newContext();
    await this.newTab();
    return this;
  }

  async newTab(url?: string): Promise<IBrowserTab> {
    if (!this.contextHandle) {
      throw new BrowserError('SESSION_NOT_FOUND', 'Browser session context is not initialized.');
    }

    const pageHandle = await this.contextHandle.newPage();
    const tabId = pageHandle.id || `tab-${this.tabs.size + 1}`;
    const tab = new BrowserTab(tabId, pageHandle);

    this.tabs.set(tabId, tab);
    this.activeTabId = tabId;

    if (url) {
      await tab.navigate(url);
    }

    return tab;
  }

  async closeTab(tabId?: string): Promise<void> {
    const targetId = tabId || this.activeTabId;
    if (!targetId || !this.tabs.has(targetId)) {
      throw new BrowserError('TAB_NOT_FOUND', `Tab "${targetId}" was not found.`);
    }

    const tab = this.tabs.get(targetId)!;
    await tab.close();
    this.tabs.delete(targetId);

    if (this.activeTabId === targetId) {
      const remainingIds = Array.from(this.tabs.keys());
      this.activeTabId = remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null;
    }
  }

  async switchTab(tabId: string): Promise<IBrowserTab> {
    if (!this.tabs.has(tabId)) {
      throw new BrowserError('TAB_NOT_FOUND', `Tab "${tabId}" does not exist in this session.`);
    }
    this.activeTabId = tabId;
    return this.tabs.get(tabId)!;
  }

  async listTabs(): Promise<TabInfo[]> {
    const results: TabInfo[] = [];
    for (const [id, tab] of this.tabs.entries()) {
      results.push(await tab.getInfo(id === this.activeTabId));
    }
    return results;
  }

  activeTab(): IBrowserTab | null {
    if (!this.activeTabId || !this.tabs.has(this.activeTabId)) {
      const first = this.tabs.values().next().value;
      return first || null;
    }
    return this.tabs.get(this.activeTabId)!;
  }

  async reconnect(): Promise<void> {
    // Collect previous URLs before reconnecting
    const previousUrls: string[] = [];
    for (const tab of this.tabs.values()) {
      try {
        const u = await tab.currentUrl();
        if (u && u !== 'about:blank') previousUrls.push(u);
      } catch {
        // ignore crashed handle
      }
    }

    try {
      await this.browserHandle.close();
    } catch {
      // ignore
    }

    this.browserHandle = await this.provider.launch(this.browserType, this.launchOptions);
    this.contextHandle = await this.browserHandle.newContext();
    this.tabs.clear();
    this.activeTabId = null;

    if (previousUrls.length > 0) {
      for (const u of previousUrls) {
        await this.newTab(u);
      }
    } else {
      await this.newTab();
    }
  }

  async close(): Promise<void> {
    try {
      if (this.contextHandle) {
        await this.contextHandle.close();
      }
      await this.browserHandle.close();
    } catch {
      // ignore
    } finally {
      this.tabs.clear();
      this.activeTabId = null;
    }
  }

  async getInfo(): Promise<SessionInfo> {
    return {
      id: this.id,
      browserType: this.browserType,
      activeTabId: this.activeTabId || undefined,
      tabs: await this.listTabs(),
    };
  }
}
