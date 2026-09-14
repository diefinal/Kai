import { describe, it, expect, beforeEach } from 'vitest';
import {
  BrowserEngine,
  DomReader,
  DomQuery,
  DomSerializer,
  MockPlaywrightProvider,
} from '../src';

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Kai Test Page</title>
</head>
<body>
  <h1>Welcome to Kai Portal</h1>
  <p>Your agentic AI desktop assistant.</p>

  <form id="login-form" action="/login" method="POST">
    <label for="username">Username</label>
    <input id="username" name="user" type="text" placeholder="Enter username" />

    <label for="password">Password</label>
    <input id="password" name="pass" type="password" placeholder="Enter password" />

    <label for="email">Email</label>
    <input id="email" name="email_address" type="email" placeholder="name@example.com" />

    <input type="checkbox" id="remember" name="remember_me" />
    <label for="remember">Remember me</label>

    <button id="login-btn" type="submit">Login</button>
    <button id="cancel-btn" type="button">Cancel</button>
  </form>

  <button id="hidden-btn" style="display: none;">Hidden Button</button>
  <div hidden id="hidden-div">Invisible text</div>

  <nav>
    <a id="gh-link" href="https://github.com/diefinal/Kai">GitHub Repo</a>
    <a id="doc-link" href="https://docs.kai.local">Documentation</a>
  </nav>

  <table id="data-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Task</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>1</td><td>Build DOM Engine</td><td>Completed</td></tr>
      <tr><td>2</td><td>Add Unit Tests</td><td>In Progress</td></tr>
    </tbody>
  </table>

  <img id="logo" src="/logo.png" alt="Kai Logo" />
</body>
</html>
`;

describe('DOM Intelligence Engine', () => {
  let reader: DomReader;

  beforeEach(() => {
    reader = new DomReader();
  });

  describe('DomReader & DomSnapshot', () => {
    it('generates complete DOM snapshot from HTML', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML, 'https://kai.local/test');

      expect(snapshot.title).toBe('Kai Test Page');
      expect(snapshot.url).toBe('https://kai.local/test');
      expect(snapshot.buttons.length).toBe(3); // login-btn, cancel-btn, hidden-btn
      expect(snapshot.inputs.length).toBe(4); // username, password, email, remember
      expect(snapshot.links.length).toBe(2);
      expect(snapshot.forms.length).toBe(1);
      expect(snapshot.tables.length).toBe(1);
      expect(snapshot.images.length).toBe(1);
      expect(snapshot.visibleText).toContain('Welcome to Kai Portal');
    });

    it('identifies and filters hidden elements', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML);
      const hiddenBtn = snapshot.elements.find((e) => e.id === 'hidden-btn');

      expect(hiddenBtn).toBeDefined();
      expect(hiddenBtn?.visible).toBe(false);

      const visibleButtons = snapshot.buttons.filter((b) => b.visible);
      expect(visibleButtons.length).toBe(2);
    });

    it('discovers forms and their input elements', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML);
      expect(snapshot.forms.length).toBe(1);

      const form = snapshot.forms[0];
      expect(form.id).toBe('login-form');
      expect(form.action).toBe('/login');
      expect(form.method).toBe('POST');
      expect(form.inputs.length).toBeGreaterThanOrEqual(4);
    });

    it('discovers tables with headers and row count', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML);
      expect(snapshot.tables.length).toBe(1);

      const table = snapshot.tables[0];
      expect(table.id).toBe('data-table');
      expect(table.headers).toEqual(['ID', 'Task', 'Status']);
      expect(table.rowCount).toBe(3); // thead row + 2 tbody rows
    });
  });

  describe('DomQuery', () => {
    it('queries elements by text (case-insensitive)', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML);
      const loginMatches = DomQuery.query(snapshot.elements, { text: 'login' });

      expect(loginMatches.length).toBeGreaterThanOrEqual(1);
      expect(loginMatches.some((e) => e.id === 'login-btn')).toBe(true);
    });

    it('queries button by text helper', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML);
      const btn = DomQuery.findButton(snapshot.elements, 'Login');

      expect(btn).not.toBeNull();
      expect(btn?.id).toBe('login-btn');
    });

    it('queries inputs by placeholder or name', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML);
      const emailInput = DomQuery.findInput(snapshot.elements, 'name@example.com');
      const passInput = DomQuery.findInput(snapshot.elements, 'pass');

      expect(emailInput).not.toBeNull();
      expect(emailInput?.id).toBe('email');
      expect(passInput).not.toBeNull();
      expect(passInput?.id).toBe('password');
    });

    it('queries links by text or href', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML);
      const ghLink = DomQuery.findLink(snapshot.elements, 'GitHub Repo');
      const docLink = DomQuery.findLink(snapshot.elements, 'docs.kai.local');

      expect(ghLink).not.toBeNull();
      expect(ghLink?.id).toBe('gh-link');
      expect(docLink).not.toBeNull();
      expect(docLink?.id).toBe('doc-link');
    });

    it('queries elements by CSS selector', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML);
      const userBox = DomQuery.findOne(snapshot.elements, { selector: '#username' });

      expect(userBox).not.toBeNull();
      expect(userBox?.id).toBe('username');
    });

    it('filters out hidden elements by default in DomQuery', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML);
      const foundHidden = DomQuery.findOne(snapshot.elements, {
        text: 'Hidden Button',
        visibleOnly: true,
      });
      const foundWithHidden = DomQuery.findOne(snapshot.elements, {
        text: 'Hidden Button',
        visibleOnly: false,
      });

      expect(foundHidden).toBeNull();
      expect(foundWithHidden).not.toBeNull();
    });

    it('finds form in snapshot', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML);
      const form = DomQuery.findForm(snapshot, 'login');

      expect(form).not.toBeNull();
      expect(form?.id).toBe('login-form');
    });
  });

  describe('DomSerializer', () => {
    it('formats a single DomElement into readable descriptor', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML);
      const btn = snapshot.buttons.find((b) => b.id === 'login-btn');
      expect(btn).toBeDefined();

      const desc = DomSerializer.formatElement(btn!);
      expect(desc).toContain('[button]');
      expect(desc).toContain('#login-btn');
      expect(desc).toContain('Login');
    });

    it('generates summary of the snapshot', () => {
      const snapshot = reader.readFromHtml(SAMPLE_HTML, 'https://kai.local/test');
      const summary = DomSerializer.toSummary(snapshot);

      expect(summary).toContain('Kai Test Page');
      expect(summary).toContain('Buttons:');
      expect(summary).toContain('Inputs:');
      expect(summary).toContain('Forms:');
    });
  });

  describe('BrowserEngine DOM Action Execution', () => {
    let mockProvider: MockPlaywrightProvider;
    let engine: BrowserEngine;

    beforeEach(async () => {
      mockProvider = new MockPlaywrightProvider(false, false, SAMPLE_HTML);
      engine = new BrowserEngine(mockProvider);
      await engine.launch('chrome');
    });

    it('executes READ_DOM action', async () => {
      const res = (await engine.executeAction('READ_DOM')) as { snapshot: any };
      expect(res.snapshot).toBeDefined();
      expect(res.snapshot.buttons.length).toBeGreaterThan(0);
      expect(res.snapshot.forms.length).toBe(1);
    });

    it('executes QUERY_DOM action', async () => {
      const res = (await engine.executeAction('QUERY_DOM', {
        text: 'Login',
        role: 'button',
      })) as { elements: any[]; count: number };

      expect(res.count).toBeGreaterThan(0);
      expect(res.elements[0].id).toBe('login-btn');
    });

    it('executes GET_FORMS action', async () => {
      const res = (await engine.executeAction('GET_FORMS')) as { forms: any[]; count: number };
      expect(res.count).toBe(1);
      expect(res.forms[0].id).toBe('login-form');
    });

    it('executes GET_BUTTONS action', async () => {
      const res = (await engine.executeAction('GET_BUTTONS')) as { buttons: any[]; count: number };
      expect(res.count).toBe(3);
    });

    it('executes GET_INPUTS action', async () => {
      const res = (await engine.executeAction('GET_INPUTS')) as { inputs: any[]; count: number };
      expect(res.count).toBe(4);
    });

    it('executes GET_LINKS action', async () => {
      const res = (await engine.executeAction('GET_LINKS')) as { links: any[]; count: number };
      expect(res.count).toBe(2);
    });

    it('executes GET_VISIBLE_TEXT action', async () => {
      const res = (await engine.executeAction('GET_VISIBLE_TEXT')) as { text: string };
      expect(res.text).toContain('Welcome to Kai Portal');
    });
  });
});
