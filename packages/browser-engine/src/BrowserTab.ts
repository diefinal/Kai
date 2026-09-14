import { BrowserError, IBrowserTab, IPlaywrightPageHandle, TabInfo } from './BrowserTypes';

export class BrowserTab implements IBrowserTab {
  constructor(
    public readonly id: string,
    private readonly pageHandle: IPlaywrightPageHandle
  ) {}

  async navigate(url: string, options?: { timeout?: number }): Promise<string> {
    const trimmed = url.trim();
    if (!trimmed) {
      throw new BrowserError('INVALID_URL', 'URL cannot be empty.');
    }

    let targetUrl = trimmed;
    if (!/^https?:\/\//i.test(targetUrl) && !/^about:/i.test(targetUrl)) {
      if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      } else {
        throw new BrowserError('INVALID_URL', `Invalid URL specified: "${url}"`);
      }
    }

    try {
      await this.pageHandle.goto(targetUrl, options);
      return this.currentUrl();
    } catch (err: any) {
      if (err instanceof BrowserError) throw err;
      const msg = err?.message || String(err);
      if (msg.includes('timeout') || msg.includes('Timeout')) {
        throw new BrowserError('NAVIGATION_TIMEOUT', `Navigation to ${targetUrl} timed out.`, err);
      }
      if (msg.includes('crash') || msg.includes('crashed')) {
        throw new BrowserError('PAGE_CRASHED', 'Browser page crashed during navigation.', err);
      }
      throw new BrowserError('DRIVER_ERROR', `Failed to navigate: ${msg}`, err);
    }
  }

  async reload(): Promise<void> {
    try {
      await this.pageHandle.reload();
    } catch (err: any) {
      throw new BrowserError('DRIVER_ERROR', `Failed to reload page: ${err?.message || err}`, err);
    }
  }

  async back(): Promise<boolean> {
    try {
      const res = await this.pageHandle.goBack();
      return Boolean(res);
    } catch (err: any) {
      throw new BrowserError('DRIVER_ERROR', `Failed to go back: ${err?.message || err}`, err);
    }
  }

  async forward(): Promise<boolean> {
    try {
      const res = await this.pageHandle.goForward();
      return Boolean(res);
    } catch (err: any) {
      throw new BrowserError('DRIVER_ERROR', `Failed to go forward: ${err?.message || err}`, err);
    }
  }

  async currentUrl(): Promise<string> {
    return this.pageHandle.url();
  }

  async title(): Promise<string> {
    try {
      return await this.pageHandle.title();
    } catch {
      return '';
    }
  }

  async close(): Promise<void> {
    try {
      await this.pageHandle.close();
    } catch (err: any) {
      throw new BrowserError('DRIVER_ERROR', `Failed to close tab: ${err?.message || err}`, err);
    }
  }

  async getInfo(isActive = false): Promise<TabInfo> {
    return {
      id: this.id,
      url: await this.currentUrl(),
      title: await this.title(),
      isActive,
    };
  }

  getPageHandle(): IPlaywrightPageHandle {
    return this.pageHandle;
  }
}
