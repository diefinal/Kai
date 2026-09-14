import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConversationContext,
  ContextManager,
} from '../src';

describe('Verification Context Integration (AGENT-001)', () => {
  let context: ConversationContext;
  let manager: ContextManager;

  beforeEach(() => {
    context = new ConversationContext();
    manager = new ContextManager(context);
  });

  describe('Context Verification State', () => {
    it('initializes with null verification state and zero retryCount', () => {
      expect(context.lastVerification()).toBeNull();
      expect(context.failureReason()).toBeNull();
      expect(context.retryCount()).toBe(0);
      expect(context.lastSuccessfulAction()).toBeNull();
    });

    it('records successful action and stores lastSuccessfulAction', () => {
      manager.recordAction('NAVIGATE', { url: 'https://github.com' }, true, { status: 200 });

      expect(context.lastExecutedAction()?.action).toBe('NAVIGATE');
      expect(context.lastSuccessfulAction()?.action).toBe('NAVIGATE');
      expect(context.lastSuccessfulAction()?.parameters.url).toBe('https://github.com');
      expect(context.failureReason()).toBeNull();
    });

    it('records failed action without overwriting lastSuccessfulAction', () => {
      manager.recordAction('NAVIGATE', { url: 'https://github.com' }, true, { status: 200 });
      manager.recordAction('CLICK_BUTTON', { selector: '#submit' }, false, { error: 'Not found' });

      expect(context.lastExecutedAction()?.action).toBe('CLICK_BUTTON');
      expect(context.lastSuccessfulAction()?.action).toBe('NAVIGATE');
      expect(context.failureReason()).toContain('CLICK_BUTTON failed');
    });

    it('records verification results and updates retry count', () => {
      manager.recordVerification(
        { success: false, confidence: 0.2, reason: 'URL mismatch' },
        'URL mismatch',
        1
      );

      expect(context.lastVerification()?.success).toBe(false);
      expect(context.lastVerification()?.confidence).toBe(0.2);
      expect(context.lastVerification()?.reason).toBe('URL mismatch');
      expect(context.failureReason()).toBe('URL mismatch');
      expect(context.retryCount()).toBe(1);
    });

    it('includes verification fields in snapshot', () => {
      manager.recordAction('OPEN_APPLICATION', { target: 'chrome' }, true);
      manager.recordVerification({ success: true, confidence: 1.0 }, undefined, 0);

      const snap = context.snapshot();
      expect(snap.lastSuccessfulAction?.action).toBe('OPEN_APPLICATION');
      expect(snap.lastVerification?.success).toBe(true);
      expect(snap.lastVerification?.confidence).toBe(1.0);
      expect(snap.retryCount).toBe(0);
      expect(snap.failureReason).toBeNull();
    });

    it('clears verification fields on context reset', () => {
      manager.recordAction('OPEN_APPLICATION', { target: 'chrome' }, true);
      manager.recordVerification({ success: false, reason: 'crash' }, 'crash', 2);
      manager.reset();

      expect(context.lastSuccessfulAction()).toBeNull();
      expect(context.lastVerification()).toBeNull();
      expect(context.failureReason()).toBeNull();
      expect(context.retryCount()).toBe(0);
    });
  });
});
