import { describe, it, expect, beforeEach } from 'vitest';
import { Planner } from '../src/Planner';
import { ReasoningEngine } from '../src/reasoning/ReasoningEngine';

describe('AI-003 Goal Oriented Reasoning Engine', () => {
  let engine: ReasoningEngine;
  let planner: Planner;

  beforeEach(() => {
    engine = new ReasoningEngine();
    planner = new Planner({ reasoningEngine: engine });
  });

  describe('Goal Analysis and Strategy Generation', () => {
    it('reasons about a simple desktop goal', () => {
      const strategy = engine.reason('Not Defteri\'ni aç ve "Merhaba Dünya" yaz');

      expect(strategy.goal).toBe('Not Defteri\'ni aç ve "Merhaba Dünya" yaz');
      expect(strategy.confidence).toBeGreaterThanOrEqual(0.7);
      expect(strategy.requiresConfirmation).toBe(false);

      const unified = strategy.toUnifiedPlan();
      expect(unified.steps.length).toBeGreaterThanOrEqual(2);
      expect(unified.steps[0].action).toBe('OPEN_APPLICATION');
      expect(unified.steps[0].parameters.target).toBe('notepad');
      expect(unified.steps[1].action).toBe('TYPE_TEXT');
      expect(unified.steps[1].parameters.text).toBe('Merhaba Dünya');
    });

    it('reasons about browser login goal when browser is NOT open', () => {
      const strategy = engine.reason('GitHub\'a giriş yap');

      expect(strategy.goal).toBe('GitHub\'a giriş yap');
      expect(strategy.steps.length).toBeGreaterThanOrEqual(2); // Precondition phase + Execution phase

      const unified = strategy.toUnifiedPlan();
      // Step 1: Open browser (Chrome)
      expect(unified.steps[0].action).toBe('OPEN_APPLICATION');
      expect(unified.steps[0].parameters.target).toBe('chrome');

      // Step 2: Navigate to login
      expect(unified.steps[1].action).toBe('NAVIGATE');
      expect(unified.steps[1].parameters.url).toBe('https://github.com/login');

      // Subsequent steps: Find inputs and button
      expect(unified.steps.some((s) => s.action === 'QUERY_DOM' && s.parameters.name === 'login')).toBe(true);
      expect(unified.steps.some((s) => s.action === 'QUERY_DOM' && s.parameters.type === 'password')).toBe(true);
      expect(unified.steps.some((s) => s.action === 'QUERY_DOM' && s.parameters.role === 'button')).toBe(true);
    });

    it('reasons about browser login goal when browser is ALREADY open on login page', () => {
      const context = {
        currentApplication: 'chrome',
        currentBrowser: {
          browserName: 'chrome',
          currentUrl: 'https://github.com/login',
        },
      };

      const strategy = engine.reason('GitHub\'a giriş yap', context);
      const unified = strategy.toUnifiedPlan();

      // Should NOT include OPEN_APPLICATION or redundant NAVIGATE
      expect(unified.steps.some((s) => s.action === 'OPEN_APPLICATION')).toBe(false);
      expect(unified.steps.some((s) => s.action === 'NAVIGATE')).toBe(false);

      // Should directly focus on finding DOM elements
      expect(unified.steps[0].action).toBe('QUERY_DOM');
    });

    it('reasons via Planner.planStrategy() facade', () => {
      const strategy = planner.planStrategy('GitHub\'a giriş yap');
      expect(strategy.goal).toBe('GitHub\'a giriş yap');
      expect(strategy.confidence).toBeGreaterThan(0.5);
      expect(Array.isArray(strategy.steps)).toBe(true);
    });
  });

  describe('Confirmation Rules', () => {
    it('requires confirmation before merging PRs', () => {
      const strategy = engine.reason('Son PR\'ı merge et');

      expect(strategy.requiresConfirmation).toBe(true);
      expect(strategy.confirmationMessage).toBeDefined();
      expect(strategy.confirmationMessage).toContain('merge');

      const unified = strategy.toUnifiedPlan();
      expect(unified.steps.some((s) => s.action === 'MERGE_PR')).toBe(true);
    });

    it('requires confirmation before deleting files', () => {
      const strategy = engine.reason('D:\\Kai\\temp.txt dosyasını sil');

      expect(strategy.requiresConfirmation).toBe(true);
      expect(strategy.confirmationMessage).toBeDefined();
      expect(strategy.confirmationMessage).toContain('sil');

      const unified = strategy.toUnifiedPlan();
      expect(unified.steps.some((s) => s.action === 'DELETE_FILE')).toBe(true);
      expect(unified.steps.find((s) => s.action === 'DELETE_FILE')?.parameters.path).toBe('D:\\Kai\\temp.txt');
    });

    it('requires confirmation before sending emails', () => {
      const strategy = engine.reason('Müşteriye email gönder');

      expect(strategy.requiresConfirmation).toBe(true);
      expect(strategy.confirmationMessage).toBeDefined();
    });

    it('requires confirmation before closing applications', () => {
      const strategy = engine.reason('Chrome uygulamasını kapat');

      expect(strategy.requiresConfirmation).toBe(true);
      expect(strategy.confirmationMessage).toBeDefined();
    });

    it('requires confirmation before modifying repository', () => {
      const strategy = engine.reason('Git commit yap');

      expect(strategy.requiresConfirmation).toBe(true);
      expect(strategy.confirmationMessage).toBeDefined();
    });

    it('does NOT require confirmation for read-only actions', () => {
      const strategy = engine.reason('Sayfayı oku');
      expect(strategy.requiresConfirmation).toBe(false);
    });
  });

  describe('Multi-Phase Strategy and Recovery', () => {
    it('produces structured ExecutionPlan phases', () => {
      const strategy = engine.reason('GitHub\'a giriş yap');

      // Precondition phase has OPEN_APPLICATION and NAVIGATE
      expect(strategy.steps[0].id).toContain('phase-precondition');
      expect(strategy.steps[0].steps.length).toBe(2);

      // Core execution phase has DOM queries
      expect(strategy.steps[1].id).toContain('phase-execution');
      expect(strategy.steps[1].steps.length).toBe(3);
    });

    it('generates recovery plan on failure', () => {
      const strategy = engine.reason('GitHub\'a giriş yap');
      expect(strategy.recoveryPlan).toBeDefined();
      expect(strategy.recoveryPlan?.steps.some((s) => s.action === 'RELOAD_PAGE')).toBe(true);

      const failedPlan = strategy.toUnifiedPlan();
      const recoveryStrategy = engine.generateRecoveryStrategy(
        failedPlan,
        new Error('DOM element not found')
      );

      expect(recoveryStrategy.requiresConfirmation).toBe(false);
      const unifiedRecovery = recoveryStrategy.toUnifiedPlan();
      expect(unifiedRecovery.steps.some((s) => s.action === 'RELOAD_PAGE')).toBe(true);
    });

    it('validates strategies correctly', () => {
      const strategy = engine.reason('GitHub\'a giriş yap');
      expect(engine.validateStrategy(strategy)).toBe(true);

      expect(
        engine.validateStrategy({
          goal: '',
          steps: [],
          confidence: 0,
          requiresConfirmation: false,
          toUnifiedPlan: () => ({ id: '1', steps: [] }),
        })
      ).toBe(false);
    });
  });
});
