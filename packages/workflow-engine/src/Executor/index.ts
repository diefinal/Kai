import { WorkflowPlan } from '../Planner';
import { ProgressTracker } from '../Progress';
import { RetryHandler } from '../Retry';
import { RollbackManager } from '../Rollback';
import { SafetyManager } from '../Safety';

export class WorkflowExecutor {
  public progress: ProgressTracker;
  public retry: RetryHandler;
  public rollback: RollbackManager;
  public safety: SafetyManager;

  constructor() {
    this.progress = new ProgressTracker();
    this.retry = new RetryHandler();
    this.rollback = new RollbackManager();
    this.safety = new SafetyManager();
  }

  public async runAutonomousWorkflow(plan: WorkflowPlan): Promise<boolean> {
    const total = plan.steps.length;
    this.progress.update('Planning...', 0, total, plan.goal);

    for (let i = 0; i < total; i++) {
      const step = plan.steps[i];
      const stepIndex = i + 1;

      // Update UI Stage
      if (step.name.includes('Build')) {
        this.progress.update('Building...', stepIndex, total);
      } else if (step.name.includes('Test')) {
        this.progress.update('Running Tests...', stepIndex, total);
      } else if (step.name.includes('Edit')) {
        this.progress.update('Editing Files...', stepIndex, total);
      } else if (step.name.includes('Read')) {
        this.progress.update('Reading Repository...', stepIndex, total);
      } else {
        this.progress.update('Verifying...', stepIndex, total);
      }

      // Check safety confirmation if step has dangerous pattern
      const isApproved = await this.safety.requestApproval(step.name, async () => true);
      if (!isApproved) {
        await this.rollback.rollbackAll();
        this.progress.update('Failed', stepIndex, total, 'User rejected safety prompt');
        return false;
      }

      // Execute step with auto retry & error recovery
      try {
        await this.retry.executeWithRetry(async () => {
          const res = await step.action();
          if (!res.success) {
            this.progress.update('Fixing Errors...', stepIndex, total, res.error);
            throw new Error(res.error || 'Step failed');
          }
          return res;
        }, step.maxRetries || 2);
      } catch (err) {
        await this.rollback.rollbackAll();
        this.progress.update('Failed', stepIndex, total, String(err));
        return false;
      }
    }

    this.progress.update('Completed', total, total, 'Workflow completed successfully');
    return true;
  }
}
