import { describe, it, expect } from 'vitest';
import { Planner } from '../src';

describe('Browser Natural Language Planner Integration (BROWSER-001)', () => {
  const planner = new Planner();

  it('generates plan for "Chrome\'u aç"', () => {
    const plan = planner.plan("Chrome'u aç");
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('OPEN_APPLICATION');
    expect(plan.steps[0].parameters.target).toBe('chrome');
  });

  it('generates plan for "GitHub\'a git"', () => {
    const plan = planner.plan("GitHub'a git");
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('NAVIGATE');
    expect(plan.steps[0].parameters.url).toBe('https://github.com');
  });

  it('generates plan for "Yeni sekme aç"', () => {
    const plan = planner.plan('Yeni sekme aç');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('NEW_TAB');
  });

  it('generates plan for "Sekmeyi kapat"', () => {
    const plan = planner.plan('Sekmeyi kapat');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('CLOSE_TAB');
  });

  it('generates plan for "Bu sayfayı yenile"', () => {
    const plan = planner.plan('Bu sayfayı yenile');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('RELOAD_PAGE');
  });

  it('generates plan for "Önceki sayfaya dön"', () => {
    const plan = planner.plan('Önceki sayfaya dön');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toBe('BACK');
  });

  it('generates multi-step plan for compound browser commands', () => {
    const plan = planner.plan("Chrome'u aç, GitHub'a git ve yeni sekme aç.");
    expect(plan.steps).toHaveLength(3);

    expect(plan.steps[0].action).toBe('OPEN_APPLICATION');
    expect(plan.steps[0].parameters.target).toBe('chrome');

    expect(plan.steps[1].action).toBe('NAVIGATE');
    expect(plan.steps[1].parameters.url).toBe('https://github.com');
    expect(plan.steps[1].dependsOn).toEqual(['step-1']);

    expect(plan.steps[2].action).toBe('NEW_TAB');
    expect(plan.steps[2].dependsOn).toEqual(['step-2']);
  });
});
