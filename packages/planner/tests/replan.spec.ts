import { describe, it, expect } from 'vitest';
import { Planner, ExecutionPlan } from '../src';

describe('Planner Replanning Engine (AGENT-001)', () => {
  const planner = new Planner();

  it('generates recovery plan for browser failure with reload and dom inspection', () => {
    const failedPlan: ExecutionPlan = {
      id: 'plan-nav-fail',
      steps: [
        {
          id: 'step-1',
          action: 'NAVIGATE',
          parameters: { url: 'https://github.com' },
        },
      ],
    };

    const recovery = planner.replanOnFailure(failedPlan, 'Navigation timeout: page did not load');
    expect(recovery).toBeDefined();
    expect(recovery.steps.length).toBeGreaterThanOrEqual(1);

    const actions = recovery.steps.map((s) => s.action);
    expect(actions).toContain('RELOAD_PAGE');
  });

  it('generates recovery plan for desktop/vision failure with screen reading', () => {
    const failedPlan: ExecutionPlan = {
      id: 'plan-desktop-fail',
      steps: [
        {
          id: 'step-1',
          action: 'OPEN_APPLICATION',
          parameters: { target: 'notepad' },
        },
      ],
    };

    const recovery = planner.replanOnFailure(failedPlan, 'Window not visible after launch');
    expect(recovery).toBeDefined();
    expect(recovery.steps.length).toBeGreaterThanOrEqual(1);

    const actions = recovery.steps.map((s) => s.action);
    expect(actions).toContain('READ_SCREEN');
  });

  it('preserves valid dependency chains in recovery plan', () => {
    const failedPlan: ExecutionPlan = {
      id: 'plan-complex-fail',
      steps: [
        {
          id: 'step-1',
          action: 'NAVIGATE',
          parameters: { url: 'https://github.com' },
        },
      ],
    };

    const recovery = planner.replanOnFailure(failedPlan, 'Navigation error');
    for (let i = 1; i < recovery.steps.length; i++) {
      expect(recovery.steps[i].dependsOn).toEqual([recovery.steps[i - 1].id]);
    }
  });
});
