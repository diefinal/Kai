import { AutonomousDecision, SafetyValidator } from './AutonomousDecision';
import { GoalTracker } from './GoalTracker';
import { TaskQueue } from './TaskQueue';
import { ExecutionPlan } from '../plans/ExecutionPlan';

export class TaskScheduler {
  constructor(
    private readonly queue: TaskQueue,
    private readonly tracker: GoalTracker = new GoalTracker()
  ) {}

  scheduleNextDecision(taskId: string): AutonomousDecision {
    const task = this.queue.get(taskId);
    if (!task) {
      return {
        taskId,
        type: 'TASK_BLOCKED',
        requiresUserConfirmation: false,
        confidence: 0,
        reason: `Task ${taskId} not found`,
      };
    }

    if (task.status === 'completed') {
      return {
        taskId,
        type: 'TASK_COMPLETED',
        requiresUserConfirmation: false,
        confidence: 1.0,
        reason: 'Task is already completed',
      };
    }

    if (task.status === 'failed') {
      return {
        taskId,
        type: 'TASK_BLOCKED',
        requiresUserConfirmation: false,
        confidence: 0,
        reason: task.waitingReason || 'Task previously failed',
      };
    }

    const currentStep = this.tracker.getCurrentStep(task);

    // All steps completed
    if (!currentStep) {
      task.status = 'completed';
      task.updatedAt = new Date();
      return {
        taskId,
        type: 'TASK_COMPLETED',
        requiresUserConfirmation: false,
        confidence: 1.0,
        reason: 'All task steps have been successfully executed.',
      };
    }

    const nextPlan: ExecutionPlan = {
      id: `plan-${task.id}-${task.currentStepIndex + 1}`,
      steps: [
        {
          id: currentStep.id,
          action: currentStep.action,
          parameters: currentStep.parameters,
        },
      ],
    };
    task.nextAction = nextPlan;

    // Check confirmation safety requirement
    const requiresConf =
      currentStep.requiresConfirmation ||
      SafetyValidator.requiresConfirmation(currentStep.action, currentStep.parameters);

    if (requiresConf) {
      task.status = 'waiting';
      const prompt = SafetyValidator.getConfirmationPrompt(
        currentStep.action,
        currentStep.parameters,
        (task.metadata?.language as 'tr' | 'en') || 'tr'
      );
      task.waitingReason = prompt;
      task.updatedAt = new Date();

      return {
        taskId,
        type: 'REQUEST_CONFIRMATION',
        plan: nextPlan,
        proposalMessage: prompt,
        requiresUserConfirmation: true,
        confidence: 0.95,
        reason: `Action ${currentStep.action} requires user confirmation`,
      };
    }

    task.status = 'running';
    task.updatedAt = new Date();

    return {
      taskId,
      type: 'EXECUTE_NEXT',
      plan: nextPlan,
      requiresUserConfirmation: false,
      confidence: 0.9,
      reason: `Autonomous execution of step: ${currentStep.action}`,
    };
  }
}
