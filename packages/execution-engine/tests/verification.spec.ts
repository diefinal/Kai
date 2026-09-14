import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  VerificationEngine,
  BrowserVerifier,
  DesktopVerifier,
  VisionVerifier,
  evaluatePolicy,
  VerificationContext,
  ExecutionEngine,
  EventBus,
  MemoryCheckpointStore,
  ExecutionPlan,
  ExecutionStep,
  EventTypes,
  StepResult,
  ContextManagerLike,
} from '../src';

describe('Execution Verification Engine (AGENT-001)', () => {
  describe('Domain Verifiers', () => {
    describe('BrowserVerifier', () => {
      const verifier = new BrowserVerifier();

      it('canVerify returns true for browser actions', () => {
        expect(verifier.canVerify('NAVIGATE')).toBe(true);
        expect(verifier.canVerify('NEW_TAB')).toBe(true);
        expect(verifier.canVerify('READ_DOM')).toBe(true);
        expect(verifier.canVerify('OPEN_APPLICATION')).toBe(false);
      });

      it('verifies NAVIGATE URL match', async () => {
        const ctx: VerificationContext = {
          action: 'NAVIGATE',
          parameters: { url: 'https://github.com' },
          browserState: { currentUrl: 'https://github.com/login' },
        };
        const res = await verifier.verify(ctx);
        expect(res.success).toBe(true);
        expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      });

      it('fails NAVIGATE when URL does not match', async () => {
        const ctx: VerificationContext = {
          action: 'NAVIGATE',
          parameters: { url: 'https://github.com' },
          browserState: { currentUrl: 'https://google.com' },
        };
        const res = await verifier.verify(ctx);
        expect(res.success).toBe(false);
        expect(res.reason).toContain('URL mismatch');
      });

      it('verifies CLOSE_TAB when tab is removed', async () => {
        const ctx: VerificationContext = {
          action: 'CLOSE_TAB',
          parameters: { tabId: 'tab-1' },
          browserState: { tabIds: ['tab-2', 'tab-3'] },
        };
        const res = await verifier.verify(ctx);
        expect(res.success).toBe(true);
      });

      it('fails CLOSE_TAB when tab still present', async () => {
        const ctx: VerificationContext = {
          action: 'CLOSE_TAB',
          parameters: { tabId: 'tab-1' },
          browserState: { tabIds: ['tab-1', 'tab-2'] },
        };
        const res = await verifier.verify(ctx);
        expect(res.success).toBe(false);
        expect(res.reason).toContain('still open');
      });

      it('verifies DOM element presence after QUERY_DOM', async () => {
        const ctx: VerificationContext = {
          action: 'QUERY_DOM',
          parameters: { selector: '#login-btn' },
          browserState: { elementCount: 1 },
        };
        const res = await verifier.verify(ctx);
        expect(res.success).toBe(true);
      });
    });

    describe('DesktopVerifier', () => {
      const verifier = new DesktopVerifier();

      it('canVerify returns true for desktop actions', () => {
        expect(verifier.canVerify('OPEN_APPLICATION')).toBe(true);
        expect(verifier.canVerify('BRING_TO_FRONT')).toBe(true);
        expect(verifier.canVerify('MAXIMIZE_WINDOW')).toBe(true);
        expect(verifier.canVerify('NAVIGATE')).toBe(false);
      });

      it('verifies application launch when process is running and window visible', async () => {
        const ctx: VerificationContext = {
          action: 'OPEN_APPLICATION',
          parameters: { target: 'chrome' },
          desktopState: {
            processName: 'chrome',
            isProcessRunning: true,
            isWindowVisible: true,
          },
        };
        const res = await verifier.verify(ctx);
        expect(res.success).toBe(true);
        expect(res.confidence).toBe(1.0);
      });

      it('fails when process is not running', async () => {
        const ctx: VerificationContext = {
          action: 'OPEN_APPLICATION',
          parameters: { target: 'chrome' },
          desktopState: {
            isProcessRunning: false,
          },
        };
        const res = await verifier.verify(ctx);
        expect(res.success).toBe(false);
        expect(res.reason).toContain('Process chrome is not running');
      });
    });

    describe('VisionVerifier', () => {
      const verifier = new VisionVerifier();

      it('canVerify returns true for vision and screen actions', () => {
        expect(verifier.canVerify('READ_SCREEN')).toBe(true);
        expect(verifier.canVerify('CAPTURE_SCREEN')).toBe(true);
        expect(verifier.canVerify('OCR')).toBe(true);
        expect(verifier.canVerify('NAVIGATE')).toBe(false);
      });

      it('verifies OCR completed when text is found', async () => {
        const ctx: VerificationContext = {
          action: 'READ_SCREEN',
          parameters: { expectedText: 'GitHub' },
          visionState: {
            ocrCompleted: true,
            detectedText: 'Welcome to GitHub Login',
            textLength: 24,
          },
        };
        const res = await verifier.verify(ctx);
        expect(res.success).toBe(true);
        expect(res.confidence).toBe(1.0);
      });

      it('fails when expectedText is missing from OCR', async () => {
        const ctx: VerificationContext = {
          action: 'READ_SCREEN',
          parameters: { expectedText: 'Dashboard' },
          visionState: {
            ocrCompleted: true,
            detectedText: 'Welcome to GitHub Login',
          },
        };
        const res = await verifier.verify(ctx);
        expect(res.success).toBe(false);
        expect(res.reason).toContain('Expected text "Dashboard" not detected');
      });
    });
  });

  describe('VerificationEngine Orchestration', () => {
    const engine = new VerificationEngine();

    it('uses custom check when provided as a boolean function', async () => {
      const ctx: VerificationContext = {
        action: 'CUSTOM_ACTION',
        customCheck: () => true,
      };
      const res = await engine.verify(ctx);
      expect(res.success).toBe(true);
      expect(res.confidence).toBe(1.0);
    });

    it('handles custom check returning false', async () => {
      const ctx: VerificationContext = {
        action: 'CUSTOM_ACTION',
        customCheck: () => false,
      };
      const res = await engine.verify(ctx);
      expect(res.success).toBe(false);
      expect(res.retrySuggested).toBe(true);
    });

    it('handles custom check timeout', async () => {
      const ctx: VerificationContext = {
        action: 'HANGING_CHECK',
        customCheck: async () => {
          await new Promise((r) => setTimeout(r, 200));
          return true;
        },
      };
      const res = await engine.verify(ctx, 50);
      expect(res.success).toBe(false);
      expect(res.reason).toContain('timed out');
    });

    it('falls back to default verifier if no state is specified', async () => {
      const ctx: VerificationContext = {
        action: 'LOG_MESSAGE',
      };
      const res = await engine.verify(ctx);
      expect(res.success).toBe(true);
      expect(res.confidence).toBe(0.8);
    });
  });

  describe('Retry Policy Evaluation', () => {
    const failedResult = {
      success: false,
      confidence: 0,
      reason: 'Element not found',
      retrySuggested: true,
    };

    it('evaluates retry_once policy', () => {
      const eval1 = evaluatePolicy(failedResult, 0, 'retry_once');
      expect(eval1.shouldRetry).toBe(true);

      const eval2 = evaluatePolicy(failedResult, 1, 'retry_once');
      expect(eval2.shouldRetry).toBe(false);
      expect(eval2.shouldAbort).toBe(true);
    });

    it('evaluates retry_three policy', () => {
      expect(evaluatePolicy(failedResult, 0, 'retry_three').shouldRetry).toBe(true);
      expect(evaluatePolicy(failedResult, 2, 'retry_three').shouldRetry).toBe(true);
      expect(evaluatePolicy(failedResult, 3, 'retry_three').shouldRetry).toBe(false);
      expect(evaluatePolicy(failedResult, 3, 'retry_three').shouldAbort).toBe(true);
    });

    it('evaluates abort policy', () => {
      const res = evaluatePolicy(failedResult, 0, 'abort');
      expect(res.shouldRetry).toBe(false);
      expect(res.shouldAbort).toBe(true);
    });

    it('evaluates ask_user policy', () => {
      const res = evaluatePolicy(failedResult, 0, 'ask_user');
      expect(res.shouldAskUser).toBe(true);
      expect(res.shouldRetry).toBe(false);
    });

    it('evaluates replan policy', () => {
      const res = evaluatePolicy(failedResult, 0, 'replan');
      expect(res.shouldReplan).toBe(true);
      expect(res.shouldRetry).toBe(false);
    });
  });

  describe('ExecutionEngine Integration with Verification', () => {
    let eventBus: EventBus;
    let checkpointStore: MemoryCheckpointStore;
    let events: any[] = [];

    beforeEach(() => {
      eventBus = new EventBus();
      checkpointStore = new MemoryCheckpointStore();
      events = [];
      Object.values(EventTypes).forEach((eventName) => {
        eventBus.subscribe(eventName, (payload) => {
          events.push({ eventName, payload });
        });
      });
    });

    const waitForEvent = (eventName: string) => {
      return new Promise((resolve) => {
        eventBus.subscribe(eventName, resolve);
      });
    };

    it('dispatches VerificationStarted and VerificationCompleted on success', async () => {
      const executorFn = vi.fn().mockResolvedValue(new StepResult(true, { currentUrl: 'https://github.com' }));
      const recordedVerifications: any[] = [];
      const contextManagerMock: ContextManagerLike = {
        recordAction: vi.fn(),
        recordVerification: (v) => recordedVerifications.push(v),
      };

      const engine = new ExecutionEngine(
        eventBus,
        checkpointStore,
        executorFn,
        contextManagerMock
      );

      const step = new ExecutionStep('step-1', 'NAVIGATE', { url: 'https://github.com' });
      step.context = {
        browserState: { currentUrl: 'https://github.com' },
      };

      const plan = new ExecutionPlan('plan-v1', [step]);

      const done = waitForEvent(EventTypes.ExecutionCompleted);
      await engine.submit(plan);
      await done;

      const vStarted = events.find((e) => e.eventName === EventTypes.VerificationStarted);
      const vCompleted = events.find((e) => e.eventName === EventTypes.VerificationCompleted);
      expect(vStarted).toBeDefined();
      expect(vCompleted).toBeDefined();
      expect(vCompleted.payload.result.success).toBe(true);
      expect(recordedVerifications).toHaveLength(1);
      expect(recordedVerifications[0].success).toBe(true);
    });

    it('retries when verification fails under retry_once policy', async () => {
      let attempts = 0;
      const executorFn = vi.fn().mockImplementation(async (step: ExecutionStep) => {
        attempts++;
        if (attempts === 1) {
          step.context = { browserState: { currentUrl: 'https://wrong.com' } };
        } else {
          step.context = { browserState: { currentUrl: 'https://github.com' } };
        }
        return new StepResult(true, { attempt: attempts });
      });

      const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);
      const step = new ExecutionStep('step-retry', 'NAVIGATE', { url: 'https://github.com' });
      step.retryPolicy = 'retry_once';

      const plan = new ExecutionPlan('plan-retry', [step]);
      const done = waitForEvent(EventTypes.ExecutionCompleted);
      await engine.submit(plan);
      await done;

      expect(attempts).toBe(2);
      const vFailed = events.filter((e) => e.eventName === EventTypes.VerificationFailed);
      const vCompleted = events.filter((e) => e.eventName === EventTypes.VerificationCompleted);
      expect(vFailed).toHaveLength(1);
      expect(vCompleted).toHaveLength(1);
    });

    it('dispatches ReplanRequested when verification fails under replan policy', async () => {
      const executorFn = vi.fn().mockResolvedValue(new StepResult(true, { status: 'bad' }));
      const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);

      const step = new ExecutionStep('step-replan', 'NAVIGATE', { url: 'https://github.com' });
      step.retryPolicy = 'replan';
      step.context = { browserState: { currentUrl: 'https://failed.com' } };

      const plan = new ExecutionPlan('plan-replan', [step]);
      const failed = waitForEvent(EventTypes.ExecutionFailed);
      await engine.submit(plan);
      await failed;

      const replanEvent = events.find((e) => e.eventName === EventTypes.ReplanRequested);
      expect(replanEvent).toBeDefined();
      expect(replanEvent.payload.stepId).toBe('step-replan');
    });

    it('asks user when verification fails under ask_user policy and resumes if granted', async () => {
      const executorFn = vi.fn().mockResolvedValue(new StepResult(true, 'done'));
      const engine = new ExecutionEngine(eventBus, checkpointStore, executorFn);

      const step = new ExecutionStep('step-ask', 'OPEN_APPLICATION', { target: 'chrome' });
      step.retryPolicy = 'ask_user';
      step.context = { desktopState: { isProcessRunning: false } };

      const plan = new ExecutionPlan('plan-ask', [step]);

      eventBus.subscribe(EventTypes.PermissionRequested, (payload: any) => {
        engine.providePermission(payload.id, true);
      });

      const done = waitForEvent(EventTypes.ExecutionCompleted);
      await engine.submit(plan);
      await done;

      const permReq = events.find((e) => e.eventName === EventTypes.PermissionRequested);
      expect(permReq).toBeDefined();
      expect(permReq.payload.stepId).toBe('step-ask');
    });
  });
});
