import { ExecutionQueue } from '../scheduler/ExecutionQueue';
import { ExecutionContext } from '../context/ExecutionContext';
import { ExecutionAdapter } from './ExecutionAdapter';
import { ExecutionResult } from './ExecutionResult';

/**
 * Default in-memory ExecutionAdapter for testing and standalone operation.
 */
export class DefaultExecutionAdapter implements ExecutionAdapter {
  constructor(
    private readonly taskExecutor?: (
      taskId: string,
      context: ExecutionContext
    ) => Promise<void>
  ) {}

  async execute(
    queue: ExecutionQueue,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let completedTasks = 0;

    for (const task of queue.tasks) {
      try {
        if (this.taskExecutor) {
          await this.taskExecutor(task.id, context);
        }
        completedTasks++;
      } catch {
        return {
          success: false,
          completedTasks,
          failedTask: task.id,
          durationMs: Date.now() - startTime,
        };
      }
    }

    return {
      success: true,
      completedTasks,
      durationMs: Date.now() - startTime,
    };
  }
}

export class ExecutionDispatcher {
  constructor(
    private readonly adapter: ExecutionAdapter = new DefaultExecutionAdapter()
  ) {}

  /**
   * Receives an ExecutionQueue, executes tasks sequentially via the ExecutionAdapter,
   * passes the shared ExecutionContext, stops on fatal failure, and returns the aggregated result.
   */
  async dispatch(
    queue: ExecutionQueue,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    return this.adapter.execute(queue, context);
  }
}
