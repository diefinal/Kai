import { describe, it, expect, vi } from 'vitest';
import { MultiStepPlanner } from '../src/Planner';
import { StepValidator } from '../src/Validator';
import { SafetyManager } from '../src/Safety';
import { RollbackManager } from '../src/Rollback';
import { ReportGenerator } from '../src/Report';
import { WorkflowExecutor } from '../src/Executor';

describe('Workflow Engine Suite', () => {
  it('should decompose goal into multi-step plan', () => {
    const planner = new MultiStepPlanner();
    const steps = planner.decomposeStandardGoal('PAVO entegrasyonunu test et.');
    expect(steps.length).toBe(9);
    expect(steps[0]).toBe('Read project');
    expect(steps[2]).toBe('Build');
    expect(steps[3]).toBe('Run tests');
  });

  it('should catch dangerous actions in SafetyManager', () => {
    const safety = new SafetyManager();
    expect(safety.requiresConfirmation('Delete database records')).toBe(true);
    expect(safety.requiresConfirmation('Force push to main')).toBe(true);
    expect(safety.requiresConfirmation('Read code file')).toBe(false);
  });

  it('should execute rollback stack upon request', async () => {
    const rollback = new RollbackManager();
    let undone = false;
    rollback.register(async () => {
      undone = true;
    });

    await rollback.rollbackAll();
    expect(undone).toBe(true);
  });

  it('should generate completion report with metrics', () => {
    const reporter = new ReportGenerator();
    const report = reporter.generateReport({
      goal: 'IBY-845',
      success: true,
      filesChanged: 7,
      bugsFixed: 2,
      testsPassed: 48,
      buildStatus: 'successful',
      summaryMessage: 'Ready for commit'
    });

    expect(report).toContain('Completed');
    expect(report).toContain('7 files changed');
    expect(report).toContain('2 bugs fixed');
    expect(report).toContain('48 tests passed');
    expect(report).toContain('Build successful');
  });

  it('should run multi-step workflow with real-time progress', async () => {
    const executor = new WorkflowExecutor();
    const stages: string[] = [];

    executor.progress.onProgress((p) => {
      stages.push(p.currentStage);
    });

    const success = await executor.runAutonomousWorkflow({
      goal: 'Automated task',
      steps: [
        {
          id: '1',
          name: 'Read project',
          action: async () => ({ success: true })
        },
        {
          id: '2',
          name: 'Build project',
          action: async () => ({ success: true })
        },
        {
          id: '3',
          name: 'Run Tests',
          action: async () => ({ success: true })
        }
      ]
    });

    expect(success).toBe(true);
    expect(stages).toContain('Reading Repository...');
    expect(stages).toContain('Building...');
    expect(stages).toContain('Running Tests...');
    expect(stages).toContain('Completed');
  });
});
