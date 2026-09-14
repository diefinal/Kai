import { describe, it, expect, beforeEach } from 'vitest';
import {
  BrowserEngine,
  BrowserError,
  MockPlaywrightProvider,
} from '../src';

describe('Browser Automation Foundation (BROWSER-001)', () => {
  let engine: BrowserEngine;
  let provider: MockPlaywrightProvider;

  beforeEach(() => {
    provider = new MockPlaywrightProvider();
    engine = new BrowserEngine(provider);
  });

  describe('Browser Launch & Lifecycle', () => {
    it('launches a Chrome session successfully', async () => {
      const session = await engine.launch('chrome');
      expect(session).toBeDefined();
      expect(session.browserType).toBe('chrome');
      expect(session.id).toContain('session-chrome');

      const tabs = await session.listTabs();
      expect(tabs).toHaveLength(1);
      expect(tabs[0].url).toBe('about:blank');
    });

    it('launches an Edge session successfully', async () => {
      const session = await engine.launch('edge');
      expect(session).toBeDefined();
      expect(session.browserType).toBe('edge');
      expect(session.id).toContain('session-edge');
    });

    it('closes browser and releases session', async () => {
      const session = await engine.launch('chrome');
      expect(session.activeTab()).not.toBeNull();

      await engine.close(session.id);
      expect(engine.getManager().getSession(session.id)).toBeUndefined();
    });

    it('handles Chrome not installed gracefully with friendly error', async () => {
      const failingProvider = new MockPlaywrightProvider(false, true);
      const failingEngine = new BrowserEngine(failingProvider);

      await expect(failingEngine.launch('chrome')).rejects.toThrow(BrowserError);
      await expect(failingEngine.launch('chrome')).rejects.toMatchObject({
        code: 'BROWSER_NOT_INSTALLED',
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to a valid URL and returns the current URL', async () => {
      await engine.launch('chrome');
      const url = await engine.navigate('https://github.com');
      expect(url).toBe('https://github.com');

      const current = await engine.currentUrl();
      expect(current).toBe('https://github.com');
    });

    it('automatically prefixes protocol if missing', async () => {
      await engine.launch('chrome');
      const url = await engine.navigate('github.com');
      expect(url).toBe('https://github.com');
    });

    it('reloads the active page', async () => {
      await engine.launch('chrome');
      await engine.navigate('https://github.com');
      await expect(engine.reload()).resolves.toBeUndefined();
    });

    it('supports back and forward navigation history', async () => {
      await engine.launch('chrome');
      await engine.navigate('https://github.com');
      await engine.navigate('https://github.com/features');

      expect(await engine.currentUrl()).toBe('https://github.com/features');

      const backOk = await engine.back();
      expect(backOk).toBe(true);
      expect(await engine.currentUrl()).toBe('https://github.com');

      const fwdOk = await engine.forward();
      expect(fwdOk).toBe(true);
      expect(await engine.currentUrl()).toBe('https://github.com/features');
    });

    it('rejects invalid URLs with INVALID_URL error', async () => {
      await engine.launch('chrome');
      await expect(engine.navigate('not a valid url!@#$')).rejects.toMatchObject({
        code: 'INVALID_URL',
      });
    });

    it('handles navigation timeouts with NAVIGATION_TIMEOUT error', async () => {
      const session = await engine.launch('chrome');
      const tab = session.activeTab()!;
      await expect(tab.navigate('https://slow-site.com', { timeout: 5 })).rejects.toMatchObject({
        code: 'NAVIGATION_TIMEOUT',
      });
    });

    it('handles page crash with PAGE_CRASHED error', async () => {
      await engine.launch('chrome');
      await expect(engine.navigate('https://crash-test.com')).rejects.toMatchObject({
        code: 'PAGE_CRASHED',
      });
    });
  });

  describe('Tabs Management', () => {
    it('opens new tabs and lists them', async () => {
      const session = await engine.launch('chrome');
      const tab2 = await engine.newTab('https://github.com');

      expect(tab2.id).toBeDefined();
      expect(await tab2.currentUrl()).toBe('https://github.com');

      const tabs = await session.listTabs();
      expect(tabs).toHaveLength(2);
      expect(tabs[1].isActive).toBe(true);
    });

    it('switches between tabs', async () => {
      const session = await engine.launch('chrome');
      const tab1 = session.activeTab()!;
      await tab1.navigate('https://google.com');

      const tab2 = await engine.newTab('https://github.com');
      expect((await session.listTabs()).find((t) => t.id === tab2.id)?.isActive).toBe(true);

      await engine.switchTab(tab1.id);
      expect(session.activeTab()?.id).toBe(tab1.id);
      expect(await engine.currentUrl()).toBe('https://google.com');
    });

    it('closes a tab and activates the remaining tab', async () => {
      const session = await engine.launch('chrome');
      const tab1Id = session.activeTab()!.id;
      const tab2 = await engine.newTab('https://github.com');

      await engine.closeTab(tab2.id);

      const remaining = await session.listTabs();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(tab1Id);
      expect(session.activeTab()?.id).toBe(tab1Id);
    });
  });

  describe('Multiple Simultaneous Sessions', () => {
    it('manages independent Chrome and Edge sessions simultaneously', async () => {
      const chromeSession = await engine.launch('chrome');
      const edgeSession = await engine.launch('edge');

      await engine.navigate('https://google.com', chromeSession.id);
      await engine.navigate('https://bing.com', edgeSession.id);

      expect(await engine.currentUrl(chromeSession.id)).toBe('https://google.com');
      expect(await engine.currentUrl(edgeSession.id)).toBe('https://bing.com');

      const sessions = await engine.getManager().listSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.browserType)).toEqual(['chrome', 'edge']);
    });
  });

  describe('Reconnect after Crash / Disconnect', () => {
    it('reconnects session and restores active tabs', async () => {
      const session = await engine.launch('chrome');
      await engine.navigate('https://github.com');

      // Trigger session reconnect
      await engine.reconnect(session.id);

      expect(session.activeTab()).not.toBeNull();
      expect(await session.activeTab()!.currentUrl()).toBe('https://github.com');
    });
  });

  describe('Execution Engine Actions', () => {
    it('executes all 9 browser actions via executeAction', async () => {
      // 1. OPEN_BROWSER
      const openRes = (await engine.executeAction('OPEN_BROWSER', { target: 'chrome' })) as any;
      expect(openRes.sessionId).toBeDefined();

      // 2. NAVIGATE
      const navRes = (await engine.executeAction('NAVIGATE', { url: 'https://github.com' })) as any;
      expect(navRes.url).toBe('https://github.com');

      // 3. GET_CURRENT_URL
      const urlRes = (await engine.executeAction('GET_CURRENT_URL', {})) as any;
      expect(urlRes.url).toBe('https://github.com');

      // 4. NEW_TAB
      const tabRes = (await engine.executeAction('NEW_TAB', { url: 'https://google.com' })) as any;
      expect(tabRes.tabId).toBeDefined();

      // 5. SWITCH_TAB
      const switchRes = (await engine.executeAction('SWITCH_TAB', { tabId: tabRes.tabId })) as any;
      expect(switchRes.tabId).toBe(tabRes.tabId);

      // 6. RELOAD_PAGE
      const reloadRes = (await engine.executeAction('RELOAD_PAGE', {})) as any;
      expect(reloadRes.success).toBe(true);

      // 7. BACK
      const backRes = (await engine.executeAction('BACK', {})) as any;
      expect(backRes).toHaveProperty('success');

      // 8. FORWARD
      const fwdRes = (await engine.executeAction('FORWARD', {})) as any;
      expect(fwdRes).toHaveProperty('success');

      // 9. CLOSE_TAB
      const closeRes = (await engine.executeAction('CLOSE_TAB', { tabId: tabRes.tabId })) as any;
      expect(closeRes.success).toBe(true);
    });
  });
});
