import { Goal } from '../model/Goal';
import { Plan } from '../model/Plan';
import { PlanBuilder } from '../builder/PlanBuilder';
import { TaskScheduler } from '../scheduler/TaskScheduler';
import { ExecutionContext } from '../context/ExecutionContext';
import { AgentState } from './AgentState';
import { AgentEvent, AgentEventListener } from './AgentEvent';

export class AgentLoop {
  private state: AgentState = AgentState.Idle;
  private readonly listeners: AgentEventListener[] = [];

  constructor(
    private readonly builder: PlanBuilder = new PlanBuilder(),
    private readonly scheduler: TaskScheduler = new TaskScheduler(),
    private readonly context: ExecutionContext = new ExecutionContext()
  ) {}

  getState(): AgentState {
    return this.state;
  }

  getContext(): ExecutionContext {
    return this.context;
  }

  onEvent(listener: AgentEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  private transition(state: AgentState, message: string): void {
    this.state = state;
    const event: AgentEvent = {
      timestamp: Date.now(),
      state,
      message,
    };
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  async run(goal: Goal): Promise<Plan> {
    try {
      // 1. Planning
      this.transition(AgentState.Planning, `Building plan for goal: ${goal.instruction}`);
      const rawPlan = this.builder.build({ goal });

      // 2. Scheduling
      this.transition(AgentState.Scheduling, `Scheduling tasks for goal: ${goal.instruction}`);
      const queue = this.scheduler.schedule(rawPlan);

      // Create scheduled plan with ordered tasks
      const scheduledPlan: Plan = {
        goal: rawPlan.goal,
        tasks: queue.tasks,
      };

      // 3. Executing (state transition & context setup)
      this.transition(AgentState.Executing, `Preparing execution context for ${scheduledPlan.tasks.length} task(s)`);
      this.context.set('currentGoal', goal);
      this.context.set('currentPlan', scheduledPlan);
      this.context.set('executionQueue', queue);

      // 4. Completed
      this.transition(AgentState.Completed, `Workflow completed successfully for goal: ${goal.instruction}`);
      return scheduledPlan;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.transition(AgentState.Failed, `Workflow failed: ${errorMsg}`);
      throw error;
    }
  }
}
