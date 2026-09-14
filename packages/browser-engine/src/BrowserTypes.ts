export type BrowserType = 'chrome' | 'edge' | 'chromium';

export interface BrowserLaunchOptions {
  headless?: boolean;
  channel?: string;
  cdpEndpoint?: string;
  userDataDir?: string;
  timeout?: number;
  args?: string[];
}

export interface TabInfo {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
}

export interface SessionInfo {
  id: string;
  browserType: BrowserType;
  activeTabId?: string;
  tabs: TabInfo[];
}

export type BrowserErrorCode =
  | 'BROWSER_NOT_INSTALLED'
  | 'NAVIGATION_TIMEOUT'
  | 'PAGE_CRASHED'
  | 'INVALID_URL'
  | 'TAB_NOT_FOUND'
  | 'SESSION_NOT_FOUND'
  | 'DRIVER_ERROR';

export class BrowserError extends Error {
  constructor(
    public readonly code: BrowserErrorCode,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'BrowserError';
  }
}

export interface IBrowserTab {
  readonly id: string;
  navigate(url: string, options?: { timeout?: number }): Promise<string>;
  reload(): Promise<void>;
  back(): Promise<boolean>;
  forward(): Promise<boolean>;
  currentUrl(): Promise<string>;
  title(): Promise<string>;
  close(): Promise<void>;
  getInfo(isActive?: boolean): Promise<TabInfo>;
}

export interface IBrowserSession {
  readonly id: string;
  readonly browserType: BrowserType;
  newTab(url?: string): Promise<IBrowserTab>;
  closeTab(tabId?: string): Promise<void>;
  switchTab(tabId: string): Promise<IBrowserTab>;
  listTabs(): Promise<TabInfo[]>;
  activeTab(): IBrowserTab | null;
  close(): Promise<void>;
  reconnect(): Promise<void>;
  getInfo(): Promise<SessionInfo>;
}

export interface IBrowserManager {
  createSession(browserType?: BrowserType, options?: BrowserLaunchOptions): Promise<IBrowserSession>;
  getSession(sessionId?: string): IBrowserSession | undefined;
  getActiveSession(): IBrowserSession | undefined;
  listSessions(): Promise<SessionInfo[]>;
  closeSession(sessionId: string): Promise<void>;
  closeAll(): Promise<void>;
}

export interface IPlaywrightPageHandle {
  id: string;
  goto(url: string, options?: { timeout?: number }): Promise<unknown>;
  reload(): Promise<unknown>;
  goBack(): Promise<unknown>;
  goForward(): Promise<unknown>;
  url(): string;
  title(): Promise<string>;
  close(): Promise<void>;
}

export interface IPlaywrightContextHandle {
  newPage(): Promise<IPlaywrightPageHandle>;
  pages(): IPlaywrightPageHandle[];
  close(): Promise<void>;
}

export interface IPlaywrightBrowserHandle {
  newContext(options?: unknown): Promise<IPlaywrightContextHandle>;
  close(): Promise<void>;
  isConnected(): boolean;
}

export interface IPlaywrightProvider {
  launch(browserType: BrowserType, options?: BrowserLaunchOptions): Promise<IPlaywrightBrowserHandle>;
  connectOverCDP(endpointURL: string): Promise<IPlaywrightBrowserHandle>;
}
