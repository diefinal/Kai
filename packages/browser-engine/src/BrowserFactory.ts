import { BrowserSession } from './BrowserSession';
import {
  BrowserLaunchOptions,
  BrowserType,
  IPlaywrightProvider,
} from './BrowserTypes';
import { DefaultPlaywrightProvider } from './PlaywrightProvider';

export class BrowserFactory {
  constructor(private readonly provider: IPlaywrightProvider = new DefaultPlaywrightProvider()) {}

  getProvider(): IPlaywrightProvider {
    return this.provider;
  }

  async createSession(
    browserType: BrowserType = 'chrome',
    options: BrowserLaunchOptions = {}
  ): Promise<BrowserSession> {
    const browserHandle = await this.provider.launch(browserType, options);
    const sessionId = `session-${browserType}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const session = new BrowserSession(sessionId, browserType, browserHandle, this.provider, options);
    await session.init();
    return session;
  }

  async connectSession(
    endpoint: string,
    browserType: BrowserType = 'chrome'
  ): Promise<BrowserSession> {
    const browserHandle = await this.provider.connectOverCDP(endpoint);
    const sessionId = `session-${browserType}-cdp-${Date.now()}`;
    const session = new BrowserSession(sessionId, browserType, browserHandle, this.provider);
    await session.init();
    return session;
  }
}
