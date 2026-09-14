import { chromium } from 'playwright-core';
import {
  BrowserError,
  BrowserLaunchOptions,
  BrowserType,
  IPlaywrightBrowserHandle,
  IPlaywrightContextHandle,
  IPlaywrightPageHandle,
  IPlaywrightProvider,
} from './BrowserTypes';

export class DefaultPlaywrightProvider implements IPlaywrightProvider {
  async launch(
    browserType: BrowserType,
    options: BrowserLaunchOptions = {}
  ): Promise<IPlaywrightBrowserHandle> {
    try {
      const channel =
        options.channel ||
        (browserType === 'chrome' ? 'chrome' : browserType === 'edge' ? 'msedge' : undefined);

      const browser = await chromium.launch({
        headless: options.headless ?? false,
        channel,
        args: options.args,
        timeout: options.timeout ?? 30000,
      });

      return {
        newContext: async () => {
          const ctx = await browser.newContext();
          return {
            newPage: async () => {
              const page = await ctx.newPage();
              const id = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
              return {
                id,
                goto: (url: string, opt?: { timeout?: number }) => page.goto(url, opt),
                reload: () => page.reload(),
                goBack: () => page.goBack(),
                goForward: () => page.goForward(),
                url: () => page.url(),
                title: () => page.title(),
                close: () => page.close(),
              };
            },
            pages: () => ctx.pages().map((p: any, idx: number) => ({
              id: `tab-${idx + 1}`,
              goto: (url: string, opt?: { timeout?: number }) => p.goto(url, opt),
              reload: () => p.reload(),
              goBack: () => p.goBack(),
              goForward: () => p.goForward(),
              url: () => p.url(),
              title: () => p.title(),
              close: () => p.close(),
            })),
            close: () => ctx.close(),
          };
        },
        close: () => browser.close(),
        isConnected: () => browser.isConnected(),
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.includes('Executable doesn\'t exist') ||
        msg.includes('Cannot find module') ||
        msg.includes('spawn')
      ) {
        throw new BrowserError(
          'BROWSER_NOT_INSTALLED',
          `${browserType.toUpperCase()} is not installed or executable cannot be found on this system.`,
          err
        );
      }
      throw new BrowserError('DRIVER_ERROR', `Failed to launch ${browserType}: ${msg}`, err);
    }
  }

  async connectOverCDP(endpointURL: string): Promise<IPlaywrightBrowserHandle> {
    try {
      const browser = await chromium.connectOverCDP(endpointURL);

      return {
        newContext: async () => {
          const ctx = await browser.newContext();
          return {
            newPage: async () => {
              const page = await ctx.newPage();
              const id = `tab-${Date.now()}`;
              return {
                id,
                goto: (url: string, opt?: { timeout?: number }) => page.goto(url, opt),
                reload: () => page.reload(),
                goBack: () => page.goBack(),
                goForward: () => page.goForward(),
                url: () => page.url(),
                title: () => page.title(),
                close: () => page.close(),
              };
            },
            pages: () => ctx.pages().map((p: any, idx: number) => ({
              id: `tab-${idx + 1}`,
              goto: (url: string, opt?: { timeout?: number }) => p.goto(url, opt),
              reload: () => p.reload(),
              goBack: () => p.goBack(),
              goForward: () => p.goForward(),
              url: () => p.url(),
              title: () => p.title(),
              close: () => p.close(),
            })),
            close: () => ctx.close(),
          };
        },
        close: () => browser.close(),
        isConnected: () => browser.isConnected(),
      };
    } catch (err: any) {
      throw new BrowserError('DRIVER_ERROR', `CDP connection failed: ${err?.message || err}`, err);
    }
  }
}

/**
 * In-memory Mock Playwright Provider for deterministic tests and CI environments
 */
export class MockPlaywrightProvider implements IPlaywrightProvider {
  private connected = true;

  constructor(private readonly failLaunch = false, private readonly failInstall = false) {}

  async launch(
    browserType: BrowserType,
    _options?: BrowserLaunchOptions
  ): Promise<IPlaywrightBrowserHandle> {
    if (this.failInstall) {
      throw new BrowserError(
        'BROWSER_NOT_INSTALLED',
        `${browserType.toUpperCase()} is not installed on this system.`
      );
    }
    if (this.failLaunch) {
      throw new BrowserError('DRIVER_ERROR', `Failed to launch ${browserType}`);
    }

    this.connected = true;

    return {
      newContext: async (): Promise<IPlaywrightContextHandle> => {
        const pages: IPlaywrightPageHandle[] = [];

        return {
          newPage: async (): Promise<IPlaywrightPageHandle> => {
            const pageId = `tab-${pages.length + 1}`;
            let currentUrl = 'about:blank';
            let currentTitle = 'New Tab';
            const history: string[] = [currentUrl];
            let historyIndex = 0;

            const page: IPlaywrightPageHandle = {
              id: pageId,
              goto: async (url: string, opt?: { timeout?: number }) => {
                if (opt?.timeout && opt.timeout < 10) {
                  throw new BrowserError('NAVIGATION_TIMEOUT', 'Navigation timed out.');
                }
                if (url.includes('crash')) {
                  throw new BrowserError('PAGE_CRASHED', 'Browser page crashed.');
                }
                currentUrl = url;
                currentTitle = `Page: ${url}`;
                history.push(url);
                historyIndex = history.length - 1;
                return { ok: true };
              },
              reload: async () => {
                return { ok: true };
              },
              goBack: async () => {
                if (historyIndex > 0) {
                  historyIndex--;
                  currentUrl = history[historyIndex];
                  currentTitle = `Page: ${currentUrl}`;
                  return { ok: true };
                }
                return null;
              },
              goForward: async () => {
                if (historyIndex < history.length - 1) {
                  historyIndex++;
                  currentUrl = history[historyIndex];
                  currentTitle = `Page: ${currentUrl}`;
                  return { ok: true };
                }
                return null;
              },
              url: () => currentUrl,
              title: async () => currentTitle,
              close: async () => {
                const idx = pages.indexOf(page);
                if (idx !== -1) pages.splice(idx, 1);
              },
            };

            pages.push(page);
            return page;
          },
          pages: () => [...pages],
          close: async () => {
            pages.length = 0;
          },
        };
      },
      close: async () => {
        this.connected = false;
      },
      isConnected: () => this.connected,
    };
  }

  async connectOverCDP(_endpointURL: string): Promise<IPlaywrightBrowserHandle> {
    return this.launch('chrome');
  }
}
