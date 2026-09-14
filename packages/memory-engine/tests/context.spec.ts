import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConversationContext,
  ContextManager,
  ContextResolver,
} from '../src';

describe('Conversation Context Engine (CONTEXT-001)', () => {
  let context: ConversationContext;
  let manager: ContextManager;
  let resolver: ContextResolver;

  beforeEach(() => {
    context = new ConversationContext();
    manager = new ContextManager(context);
    resolver = new ContextResolver();
  });

  describe('Context Creation', () => {
    it('initializes with clean, empty short-term state', () => {
      expect(context.currentApplication()).toBeNull();
      expect(context.currentWindow()).toBeNull();
      expect(context.currentBrowser()).toBeNull();
      expect(context.lastVisionResult()).toBeNull();
      expect(context.lastExecutionPlan()).toBeNull();
      expect(context.lastExecutedAction()).toBeNull();
      expect(context.currentLanguage()).toBe('tr');
    });

    it('creates immutable snapshot of initial state', () => {
      const snap = context.snapshot();
      expect(snap.currentApplication).toBeNull();
      expect(snap.currentWindow).toBeNull();
      expect(snap.currentBrowser).toBeNull();
      expect(snap.lastVisionResult).toBeNull();
    });
  });

  describe('Context Update', () => {
    it('updates current application directly and via window info', () => {
      context.setCurrentApplication('vscode');
      expect(context.currentApplication()).toBe('vscode');

      context.setCurrentWindow({
        title: 'Google Chrome',
        processName: 'chrome',
      });
      expect(context.currentWindow()?.title).toBe('Google Chrome');
    });

    it('updates current browser and tab information', () => {
      context.setCurrentBrowser({
        browserName: 'chrome',
        currentUrl: 'https://github.com',
        activeTabId: 'tab-1',
        tabs: [{ id: 'tab-1', url: 'https://github.com', title: 'GitHub' }],
      });

      expect(context.currentBrowser()?.browserName).toBe('chrome');
      expect(context.currentBrowser()?.currentUrl).toBe('https://github.com');
      expect(context.currentApplication()).toBe('chrome');
    });

    it('updates last vision result (screen capture & OCR)', () => {
      context.setLastVisionResult({
        timestamp: Date.now(),
        ocrLines: ['GitHub', 'Merge pull request'],
        detectedText: 'GitHub\nMerge pull request',
      });

      expect(context.lastVisionResult()?.ocrLines).toEqual(['GitHub', 'Merge pull request']);
      expect(context.lastVisionResult()?.detectedText).toContain('Merge pull request');
    });

    it('updates last executed action and execution plan', () => {
      context.setLastExecutedAction({
        action: 'OPEN_APPLICATION',
        parameters: { target: 'chrome' },
        timestamp: Date.now(),
        success: true,
      });
      expect(context.lastExecutedAction()?.action).toBe('OPEN_APPLICATION');

      context.setLastExecutionPlan({
        id: 'plan-123',
        steps: [{ id: 'step-1', action: 'OPEN_APPLICATION', parameters: { target: 'chrome' } }],
        createdAt: Date.now(),
      });
      expect(context.lastExecutionPlan()?.id).toBe('plan-123');
    });

    it('automatically records action and derives context via ContextManager', () => {
      manager.recordAction('OPEN_APPLICATION', { target: 'chrome' });

      expect(context.currentApplication()).toBe('chrome');
      expect(context.currentBrowser()?.browserName).toBe('chrome');
      expect(context.currentWindow()?.title).toBe('Google Chrome');

      manager.recordAction('NAVIGATE', { url: 'https://github.com' });
      expect(context.currentBrowser()?.currentUrl).toBe('https://github.com');
    });
  });

  describe('Context Reset', () => {
    it('resets all short-term context state upon explicit clear', () => {
      manager.recordAction('OPEN_APPLICATION', { target: 'vscode' });
      manager.recordAction('READ_SCREEN', {}, true, ['Found 1 error in line 4']);

      expect(context.currentApplication()).toBe('vscode');
      expect(context.lastVisionResult()).not.toBeNull();

      manager.reset();

      expect(context.currentApplication()).toBeNull();
      expect(context.currentWindow()).toBeNull();
      expect(context.currentBrowser()).toBeNull();
      expect(context.lastVisionResult()).toBeNull();
      expect(context.lastExecutedAction()).toBeNull();
      expect(context.lastExecutionPlan()).toBeNull();
    });
  });

  describe('Follow-Up Command Resolution', () => {
    it('resolves browser reference for follow-up navigation (Example 1)', () => {
      // User: Chrome'u aç. -> Action executed
      manager.recordAction('OPEN_APPLICATION', { target: 'chrome' });

      // User: GitHub'a git.
      const resolved = resolver.resolve("GitHub'a git", context);
      expect(resolved.targetBrowser?.browserName).toBe('chrome');
      expect(resolved.parameters.browser).toBe('chrome');
    });

    it('resolves window reference for follow-up window control (Example 2)', () => {
      // User: VS Code'u aç. -> Action executed
      manager.recordAction('OPEN_APPLICATION', { target: 'vscode' });

      // User: Bu pencereyi büyüt.
      const resolved = resolver.resolve('Bu pencereyi büyüt', context);
      expect(resolved.targetApplication).toBe('vscode');
      expect(resolved.targetWindow?.title).toBe('Visual Studio Code');
      expect(resolved.parameters.target).toBe('vscode');

      // In English: Maximize this window
      const resolvedEn = resolver.resolve('Maximize this window', context);
      expect(resolvedEn.targetApplication).toBe('vscode');
    });

    it('resolves vision context reuse for follow-up screen query (Example 3)', () => {
      // User: Ekranı oku. -> Vision executed
      manager.recordAction('READ_SCREEN', {}, true, ['Error: Cannot find module', 'at line 12']);

      // User: Burada hata var mı?
      expect(resolver.canReuseVision('Burada hata var mı?', context)).toBe(true);

      const resolved = resolver.resolve('Burada hata var mı?', context);
      expect(resolved.reuseVision).toBe(true);
      expect(resolved.parameters.reuseVision).toBe(true);
      expect(resolved.parameters.detectedText).toContain('Error: Cannot find module');
      expect(resolved.visionResult?.ocrLines).toEqual(['Error: Cannot find module', 'at line 12']);
    });

    it('does not reuse vision context when no vision result exists', () => {
      expect(resolver.canReuseVision('Burada hata var mı?', context)).toBe(false);
    });
  });
});
