import { ExecutionPlan } from '../plans/ExecutionPlan';
import { Strategy, LongTermMemoryLike } from '../reasoning/ReasoningTypes';
import { AutonomousDecision } from './AutonomousDecision';
import { GoalTracker } from './GoalTracker';
import { TaskQueue } from './TaskQueue';
import { TaskScheduler } from './TaskScheduler';
import { AgentTask, AgentTaskStep } from './TaskState';

export interface TaskManagerOptions {
  queue?: TaskQueue;
  tracker?: GoalTracker;
  scheduler?: TaskScheduler;
  memory?: LongTermMemoryLike;
}

export class TaskManager {
  private readonly queue: TaskQueue;
  private readonly tracker: GoalTracker;
  private readonly scheduler: TaskScheduler;
  private readonly memory?: LongTermMemoryLike;

  constructor(options: TaskManagerOptions = {}) {
    this.queue = options.queue || new TaskQueue();
    this.tracker = options.tracker || new GoalTracker();
    this.scheduler = options.scheduler || new TaskScheduler(this.queue, this.tracker);
    this.memory = options.memory;
  }

  createTask(
    goal: string,
    planOrStrategy?: ExecutionPlan | Strategy,
    options?: { priority?: number; metadata?: Record<string, unknown> }
  ): AgentTask {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    let steps: AgentTaskStep[] = [];
    if (planOrStrategy) {
      if ('toUnifiedPlan' in planOrStrategy && typeof planOrStrategy.toUnifiedPlan === 'function') {
        steps = this.tracker.createStepsFromStrategy(planOrStrategy as Strategy);
      } else {
        steps = this.tracker.createStepsFromPlan(planOrStrategy as ExecutionPlan);
      }
    }

    const task: AgentTask = {
      id,
      goal,
      status: 'pending',
      priority: options?.priority ?? 1,
      createdAt: now,
      updatedAt: now,
      steps,
      currentStepIndex: 0,
      metadata: options?.metadata || {},
      historySummary: [`Task created: ${goal}`],
    };

    this.queue.enqueue(task);
    return task;
  }

  getTask(taskId: string): AgentTask | undefined {
    return this.queue.get(taskId);
  }

  async evaluateNextStep(taskId: string): Promise<AutonomousDecision> {
    const decision = this.scheduler.scheduleNextDecision(taskId);

    if (decision.type === 'TASK_COMPLETED') {
      await this.archiveTaskToMemory(taskId);
    }

    return decision;
  }

  async advanceStep(taskId: string, result?: unknown): Promise<AgentTask> {
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    this.tracker.markCurrentStepCompleted(task, result);

    if (task.currentStepIndex >= task.steps.length) {
      task.status = 'completed';
      task.updatedAt = new Date();
      await this.archiveTaskToMemory(taskId);
    } else {
      task.status = 'pending';
    }

    return task;
  }

  async confirmStep(taskId: string): Promise<AgentTask> {
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    if (task.status === 'waiting') {
      task.status = 'running';
      task.waitingReason = undefined;
      task.updatedAt = new Date();
    }

    return task;
  }

  interruptTask(taskId: string): AgentTask {
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    task.status = 'waiting';
    task.interruptedAt = new Date();
    task.waitingReason = 'Interrupted by user';
    task.updatedAt = new Date();
    if (!task.historySummary) task.historySummary = [];
    task.historySummary.push('Workflow interrupted');

    return task;
  }

  async resumeTask(taskId: string): Promise<AutonomousDecision> {
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    task.interruptedAt = undefined;
    task.waitingReason = undefined;
    task.status = 'pending';
    task.updatedAt = new Date();

    if (!task.historySummary) task.historySummary = [];
    task.historySummary.push('Workflow resumed');

    return this.evaluateNextStep(taskId);
  }

  async completeTask(taskId: string): Promise<AgentTask> {
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    task.status = 'completed';
    task.updatedAt = new Date();
    for (const step of task.steps) {
      step.completed = true;
    }

    await this.archiveTaskToMemory(taskId);
    return task;
  }

  failTask(taskId: string, error: string): AgentTask {
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    task.status = 'failed';
    task.waitingReason = error;
    task.updatedAt = new Date();
    this.tracker.markCurrentStepFailed(task, error);
    return task;
  }

  async retryTask(taskId: string): Promise<AutonomousDecision> {
    const task = this.queue.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);

    task.status = 'pending';
    task.waitingReason = undefined;
    task.updatedAt = new Date();
    if (!task.historySummary) task.historySummary = [];
    task.historySummary.push('Retrying task');

    return this.evaluateNextStep(taskId);
  }

  private async archiveTaskToMemory(taskId: string): Promise<void> {
    const task = this.queue.get(taskId);
    if (!task || !this.memory) return;

    try {
      const summary = (task.historySummary || []).join('\n');
      if ('save' in this.memory && typeof (this.memory as any).save === 'function') {
        await (this.memory as any).save({
          category: 'learned_behaviors',
          title: `Completed Task: ${task.goal}`,
          content: `Goal: ${task.goal}\nStatus: completed\nSteps: ${task.steps.length}\n\n${summary}`,
          tags: ['autonomous_task', 'completed', task.goal.toLowerCase().substring(0, 20)],
          importance: 1.0,
        });
      }
    } catch {
      // Memory persistence should never break task execution
    }
  }

  getActiveTasks(): AgentTask[] {
    return this.queue.getActiveTasks();
  }

  getWaitingTasks(): AgentTask[] {
    return this.queue.getByStatus('waiting');
  }

  getCompletedTasks(): AgentTask[] {
    return this.queue.getByStatus('completed');
  }

  getQueue(): TaskQueue {
    return this.queue;
  }

  getTracker(): GoalTracker {
    return this.tracker;
  }

  getScheduler(): TaskScheduler {
    return this.scheduler;
  }
}
