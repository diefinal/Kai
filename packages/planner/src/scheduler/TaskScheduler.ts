import { Plan } from '../model/Plan';
import { TaskStatus } from '../model/TaskStatus';
import { DependencyResolver } from './DependencyResolver';
import { ExecutionQueue } from './ExecutionQueue';

export class TaskScheduler {
  constructor(
    private readonly resolver: DependencyResolver = new DependencyResolver()
  ) {}

  /**
   * Schedules tasks from a Plan into an ExecutionQueue.
   * - Resolves dependency ordering
   * - Skips already completed tasks
   * - Keeps pending and uncompleted tasks
   */
  schedule(plan: Plan): ExecutionQueue {
    if (!plan || !plan.tasks || plan.tasks.length === 0) {
      return { tasks: [] };
    }

    // Filter out already completed tasks
    const activeTasks = plan.tasks.filter(
      (task) => task.status !== TaskStatus.Completed
    );

    if (activeTasks.length === 0) {
      return { tasks: [] };
    }

    // Topologically sort the active tasks
    const orderedTasks = this.resolver.resolve(activeTasks);

    return {
      tasks: orderedTasks,
    };
  }
}
