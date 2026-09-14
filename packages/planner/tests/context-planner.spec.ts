import { describe, it, expect } from 'vitest';
import { Planner, ConversationContextLike } from '../src';

describe('Planner Context Integration (CONTEXT-001)', () => {
  const planner = new Planner();

  it('Example 1: Resolves browser session for follow-up navigation', () => {
    // User had opened Chrome
    const context: ConversationContextLike = {
      currentApplication: () => 'chrome',
      currentBrowser: () => ({ browserName: 'chrome', currentUrl: 'https://google.com' }),
      currentWindow: () => ({ title: 'Google Chrome', processName: 'chrome' }),
      lastVisionResult: () => null,
      lastExecutionPlan: () => null,
      lastExecutedAction: () => null,
      currentLanguage: () => 'tr',
    };

    // Follow-up: GitHub'a git
    const plan = planner.plan("GitHub'a git", context);

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('NAVIGATE');
    expect(plan.steps[0].parameters.url).toBe('https://github.com');
    expect(plan.steps[0].parameters.browser).toBe('chrome');
  });

  it('Example 2: Resolves active window for follow-up window manipulation', () => {
    // User had opened VS Code
    const context: ConversationContextLike = {
      currentApplication: () => 'vscode',
      currentWindow: () => ({ title: 'Visual Studio Code', processName: 'vscode' }),
      currentBrowser: () => null,
      lastVisionResult: () => null,
      lastExecutionPlan: () => null,
      lastExecutedAction: () => null,
      currentLanguage: () => 'tr',
    };

    // Follow-up: Bu pencereyi büyüt
    const plan = planner.plan('Bu pencereyi büyüt', context);

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('MAXIMIZE_WINDOW');
    expect(plan.steps[0].parameters.target).toBe('vscode');
  });

  it('Example 3: Automatically reuses last screen analysis without re-capturing', () => {
    // User had executed "Ekranı oku"
    const context: ConversationContextLike = {
      currentApplication: () => 'vscode',
      currentWindow: () => ({ title: 'Visual Studio Code', processName: 'vscode' }),
      currentBrowser: () => null,
      lastVisionResult: () => ({
        timestamp: Date.now(),
        ocrLines: ['TypeError: Cannot read property of undefined', 'at index.ts:45'],
        detectedText: 'TypeError: Cannot read property of undefined\nat index.ts:45',
      }),
      lastExecutionPlan: () => null,
      lastExecutedAction: () => null,
      currentLanguage: () => 'tr',
    };

    // Follow-up: Burada hata var mı?
    const plan = planner.plan('Burada hata var mı?', context);

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('ANALYZE_SCREEN_TEXT');
    expect(plan.steps[0].parameters.reuseVision).toBe(true);
    expect(plan.steps[0].parameters.detectedText).toContain('TypeError');
  });
});
