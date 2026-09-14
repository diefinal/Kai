import { describe, it, expect, beforeEach } from 'vitest';
import {
  BrowserEngine,
  MockPlaywrightProvider,
  AutomationEngine,
  ElementResolver,
} from '../src';

describe('Intelligent Web Automation Engine (BROWSER-003)', () => {
  let provider: MockPlaywrightProvider;
  let engine: BrowserEngine;
  let automation: AutomationEngine;

  const testHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>Test Automation Portal</title></head>
      <body>
        <h1>Welcome to Portal</h1>
        
        <nav>
          <a href="/dashboard" id="dash-link">Go to Dashboard</a>
          <a href="/help" aria-label="Help and Documentation">Help</a>
        </nav>

        <form id="login-form" action="/api/login" method="POST">
          <div>
            <label for="username">Email</label>
            <input id="username" name="email" type="text" placeholder="name@example.com" />
          </div>
          <div>
            <label for="password">Password</label>
            <input id="password" name="password" type="password" placeholder="Enter password" />
          </div>
          <div>
            <label for="country">Country</label>
            <select id="country" name="country">
              <option value="us">United States</option>
              <option value="tr">Turkey</option>
              <option value="de">Germany</option>
            </select>
          </div>
          <div>
            <input id="remember" type="checkbox" name="remember" />
            <label for="remember">Remember me</label>
          </div>
          <button type="submit" id="login-btn">Giriş Yap</button>
          <button type="button" id="hidden-btn" style="display: none;">Hidden</button>
        </form>
      </body>
    </html>
  `;

  beforeEach(() => {
    provider = new MockPlaywrightProvider(false, false, testHtml);
    engine = new BrowserEngine(provider);
    automation = engine.getAutomation();
  });

  describe('Smart Element Resolution', () => {
    const resolver = new ElementResolver();

    it('resolves button by visible text (natural language)', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;
      const snapshot = await engine.getDomEngine().readDom(tab);

      const match = resolver.resolve(snapshot.elements, 'Giriş Yap');
      expect(match).not.toBeNull();
      expect(match?.element.tag).toBe('button');
      expect(match?.element.text).toBe('Giriş Yap');
      expect(match?.score).toBeGreaterThanOrEqual(60);
    });

    it('resolves input by placeholder', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;
      const snapshot = await engine.getDomEngine().readDom(tab);

      const match = resolver.resolve(snapshot.elements, {
        placeholder: 'name@example.com',
      });
      expect(match).not.toBeNull();
      expect(match?.element.id).toBe('username');
      expect(match?.element.name).toBe('email');
    });

    it('resolves element by aria-label', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;
      const snapshot = await engine.getDomEngine().readDom(tab);

      const match = resolver.resolve(snapshot.elements, {
        ariaLabel: 'Help and Documentation',
      });
      expect(match).not.toBeNull();
      expect(match?.element.tag).toBe('a');
      expect(match?.element.ariaLabel).toBe('Help and Documentation');
    });

    it('filters out hidden elements when visibleOnly is true', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;
      const snapshot = await engine.getDomEngine().readDom(tab);

      const hiddenMatch = resolver.resolve(snapshot.elements, {
        text: 'Hidden',
        visibleOnly: true,
      });
      expect(hiddenMatch).toBeNull();
    });

    it('generates multiple fallback alternative selectors for resilience', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;
      const snapshot = await engine.getDomEngine().readDom(tab);

      const match = resolver.resolve(snapshot.elements, { text: 'Giriş Yap' });
      expect(match?.alternativeSelectors).toBeDefined();
      expect(match?.alternativeSelectors.length).toBeGreaterThan(0);
      expect(match?.alternativeSelectors).toContain('#login-btn');
    });
  });

  describe('Action Execution (Click, Fill, Select, Check, Submit)', () => {
    it('clicks button and verifies DOM/navigation state', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;

      const result = await automation.click(tab, 'Giriş Yap');
      expect(result.success).toBe(true);
      expect(result.action).toBe('CLICK');
      expect(result.targetElement?.text).toBe('Giriş Yap');
      expect(result.verification).toBeDefined();

      const ctx = automation.getContext();
      expect(ctx.lastClickedElement?.text).toBe('Giriş Yap');
    });

    it('clicks link to trigger navigation', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;

      const result = await automation.click(tab, { text: 'Dashboard' });
      expect(result.success).toBe(true);
      expect(result.action).toBe('CLICK');
      expect(result.targetElement?.tag).toBe('a');
    });

    it('fills input field and updates context', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;

      const result = await automation.fill(tab, { placeholder: 'name@example.com' }, 'user@kai.ai');
      expect(result.success).toBe(true);
      expect(result.action).toBe('FILL');
      expect(result.targetElement?.id).toBe('username');

      const ctx = automation.getContext();
      expect(ctx.focusedInput?.id).toBe('username');
      expect(ctx.lastFilledInput?.id).toBe('username');
    });

    it('fills password field', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;

      const result = await automation.fill(tab, { type: 'password' }, 'secret123');
      expect(result.success).toBe(true);
      expect(result.targetElement?.id).toBe('password');
    });

    it('selects option in dropdown', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;

      const result = await automation.select(tab, { selector: '#country' }, 'tr');
      expect(result.success).toBe(true);
      expect(result.action).toBe('SELECT');
    });

    it('checks checkbox element', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;

      const result = await automation.check(tab, { selector: '#remember' }, true);
      expect(result.success).toBe(true);
      expect(result.action).toBe('CHECK');
    });

    it('submits form intelligently finding submit button', async () => {
      const session = await engine.launch('chrome');
      const tab = (await session.newTab('https://portal.example.com')) as any;

      const result = await automation.submitForm(tab, 'login-form');
      expect(result.success).toBe(true);
      expect(result.action).toBe('SUBMIT_FORM');

      const ctx = automation.getContext();
      expect(ctx.currentForm?.id).toBe('login-form');
    });
  });

  describe('BrowserEngine executeAction Integration', () => {
    it('executes CLICK_BUTTON via natural parameters', async () => {
      await engine.navigate('https://portal.example.com');
      const res = await engine.executeAction('CLICK_BUTTON', { text: 'Giriş Yap' }) as any;
      expect(res.success).toBe(true);
      expect(res.action).toBe('CLICK');
    });

    it('executes FILL_INPUT via natural parameters', async () => {
      await engine.navigate('https://portal.example.com');
      const res = await engine.executeAction('FILL_INPUT', {
        placeholder: 'name@example.com',
        value: 'test@example.com',
      }) as any;
      expect(res.success).toBe(true);
      expect(res.action).toBe('FILL');
    });

    it('executes SUBMIT_FORM action', async () => {
      await engine.navigate('https://portal.example.com');
      const res = await engine.executeAction('SUBMIT_FORM', { form: 'login-form' }) as any;
      expect(res.success).toBe(true);
    });
  });
});
