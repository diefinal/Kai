import { describe, it, expect, beforeEach } from 'vitest';
import { ContextManager } from '../src/context/ContextManager';

describe('DOM Conversation Context Integration', () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  it('records READ_DOM snapshot in conversation context', () => {
    manager.recordAction(
      'READ_DOM',
      {},
      true,
      {
        snapshot: {
          title: 'Kai Web App',
          url: 'https://kai.local',
          timestamp: 123456789,
          forms: [{ id: 'f1' }],
          buttons: [{ id: 'b1', tag: 'button', text: 'Submit' }],
          inputs: [{ id: 'i1', tag: 'input', placeholder: 'Search' }],
          visibleText: 'Welcome to Kai',
        },
      }
    );

    const snapshot = manager.getContext().currentDomSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.title).toBe('Kai Web App');
    expect(snapshot?.formsCount).toBe(1);
    expect(snapshot?.buttonsCount).toBe(1);
    expect(snapshot?.inputsCount).toBe(1);
    expect(snapshot?.visibleText).toBe('Welcome to Kai');
  });

  it('records QUERY_DOM criteria and lastSelectedElement in context', () => {
    const matchedEl = {
      id: 'login-btn',
      tag: 'button',
      role: 'button',
      text: 'Login',
      selector: '#login-btn',
      visible: true,
      enabled: true,
    };

    manager.recordAction(
      'QUERY_DOM',
      { role: 'button', text: 'Login' },
      true,
      {
        elements: [matchedEl],
        count: 1,
      }
    );

    const query = manager.getContext().lastDomQuery();
    expect(query).not.toBeNull();
    expect(query?.criteria.text).toBe('Login');
    expect(query?.matchedCount).toBe(1);

    const selected = manager.getContext().lastSelectedElement();
    expect(selected).not.toBeNull();
    expect(selected?.id).toBe('login-btn');
  });

  it('clears DOM state on reset', () => {
    manager.recordAction(
      'QUERY_DOM',
      { text: 'Search' },
      true,
      {
        elements: [{ id: 'search-input', tag: 'input', selector: '#search', visible: true, enabled: true }],
        count: 1,
      }
    );

    expect(manager.getContext().lastDomQuery()).not.toBeNull();
    manager.reset();
    expect(manager.getContext().lastDomQuery()).toBeNull();
    expect(manager.getContext().lastSelectedElement()).toBeNull();
    expect(manager.getContext().currentDomSnapshot()).toBeNull();
  });

  it('includes DOM state in immutable context snapshot', () => {
    manager.recordAction(
      'READ_DOM',
      {},
      true,
      {
        snapshot: {
          title: 'Test',
          url: 'https://test.com',
          buttons: [],
        },
      }
    );

    const snap = manager.getContext().snapshot();
    expect(snap.currentDomSnapshot).not.toBeNull();
    expect(snap.currentDomSnapshot?.title).toBe('Test');
  });
});
