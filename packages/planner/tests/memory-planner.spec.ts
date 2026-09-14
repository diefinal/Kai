import { describe, it, expect } from 'vitest';
import { Planner, ConversationContextLike } from '../src';

describe('Planner Long-Term Memory Integration (MEMORY-001)', () => {
  const planner = new Planner();

  it('Example 1: User prefers Edge -> Planner selects Edge over default Chrome', () => {
    const context: ConversationContextLike = {
      preferredBrowser: () => 'edge',
      currentApplication: () => null,
      currentBrowser: () => null,
      currentWindow: () => null,
      lastVisionResult: () => null,
      lastExecutionPlan: () => null,
      lastExecutedAction: () => null,
      currentLanguage: () => 'tr',
    };

    // User: Tarayıcıyı aç
    const plan = planner.plan('Tarayıcıyı aç', context);

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('OPEN_APPLICATION');
    expect(plan.steps[0].parameters.target).toBe('edge');
  });

  it('Example 2: User requests project document -> Planner recalls project last document', () => {
    const context: ConversationContextLike = {
      activeProject: () => ({
        name: 'Pizza Bomb',
        path: 'D:\\Projects\\PizzaBomb',
        lastDocument: 'D:\\Projects\\PizzaBomb\\teklif.docx',
      }),
      currentApplication: () => null,
      currentBrowser: () => null,
      currentWindow: () => null,
      lastVisionResult: () => null,
      lastExecutionPlan: () => null,
      lastExecutedAction: () => null,
      currentLanguage: () => 'tr',
    };

    // User: Pizza Bomb teklifini aç
    const plan = planner.plan('Pizza Bomb teklifini aç', context);

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('OPEN_FILE');
    expect(plan.steps[0].parameters.path).toBe('D:\\Projects\\PizzaBomb\\teklif.docx');
  });

  it('ReasoningEngine applies preferredBrowser in constraint resolution', () => {
    const strategy = planner.getReasoningEngine().reason('GitHub\'a giriş yap', {
      preferredBrowser: 'edge',
    });

    const unified = strategy.toUnifiedPlan();
    expect(unified.steps[0].action).toBe('OPEN_APPLICATION');
    expect(unified.steps[0].parameters.target).toBe('edge');
    expect(unified.steps[1].action).toBe('NAVIGATE');
    expect(unified.steps[1].parameters.browser).toBe('edge');
  });
});
