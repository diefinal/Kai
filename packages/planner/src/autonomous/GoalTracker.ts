import { ExecutionPlan } from '../plans/ExecutionPlan';
import { Strategy } from '../reasoning/ReasoningTypes';
import { AgentTask, AgentTaskStep } from './TaskState';
import { SafetyValidator } from './AutonomousDecision';

export class GoalTracker {
  createStepsFromPlan(plan: ExecutionPlan): AgentTaskStep[] {
    return plan.steps.map((step, idx) => ({
      id: step.id || `step-${idx + 1}`,
      description: `${step.action}(${JSON.stringify(step.parameters)})`,
      action: step.action,
      parameters: step.parameters,
      completed: false,
      requiresConfirmation: SafetyValidator.requiresConfirmation(step.action, step.parameters),
    }));
  }

  createStepsFromStrategy(strategy: Strategy): AgentTaskStep[] {
    const steps: AgentTaskStep[] = [];
    let count = 0;

    for (const phase of strategy.steps) {
      for (const step of phase.steps) {
        count++;
        steps.push({
          id: step.id || `step-${count}`,
          description: `${step.action}(${JSON.stringify(step.parameters)})`,
          action: step.action,
          parameters: step.parameters,
          completed: false,
          requiresConfirmation:
            strategy.requiresConfirmation ||
            SafetyValidator.requiresConfirmation(step.action, step.parameters),
        });
      }
    }

    return steps;
  }

  getProgress(task: AgentTask): { completed: number; total: number; percentage: number } {
    const total = task.steps.length;
    const completed = task.steps.filter((s) => s.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }

  getCurrentStep(task: AgentTask): AgentTaskStep | undefined {
    if (task.currentStepIndex >= 0 && task.currentStepIndex < task.steps.length) {
      return task.steps[task.currentStepIndex];
    }
    return undefined;
  }

  markCurrentStepCompleted(task: AgentTask, result?: unknown): void {
    const current = this.getCurrentStep(task);
    if (current) {
      current.completed = true;
      current.result = result;
      if (!task.historySummary) task.historySummary = [];
      task.historySummary.push(`Completed: ${current.action}`);
      task.currentStepIndex++;
      task.updatedAt = new Date();
    }
  }

  markCurrentStepFailed(task: AgentTask, error: string): void {
    const current = this.getCurrentStep(task);
    if (current) {
      current.error = error;
      if (!task.historySummary) task.historySummary = [];
      task.historySummary.push(`Failed: ${current.action} (${error})`);
      task.updatedAt = new Date();
    }
  }
}
