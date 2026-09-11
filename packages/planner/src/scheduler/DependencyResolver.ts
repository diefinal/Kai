import { Task } from '../model/Task';

export class DependencyResolver {
  /**
   * Resolves dependencies for a set of tasks using topological sort (Kahn's / DFS algorithm).
   * Throws an error if a circular dependency cycle is detected.
   * Preserves deterministic order for independent tasks.
   */
  resolve(tasks: Task[]): Task[] {
    if (!tasks || tasks.length === 0) {
      return [];
    }

    const taskMap = new Map<string, Task>();
    for (const task of tasks) {
      taskMap.set(task.id, task);
    }

    const inDegree = new Map<string, number>();
    const dependentsMap = new Map<string, string[]>();

    for (const task of tasks) {
      inDegree.set(task.id, 0);
      dependentsMap.set(task.id, []);
    }

    for (const task of tasks) {
      for (const depId of task.dependsOn) {
        if (taskMap.has(depId)) {
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
          dependentsMap.get(depId)!.push(task.id);
        }
      }
    }

    // Initialize queue with root tasks (in-degree === 0), maintaining original order
    const queue: string[] = [];
    for (const task of tasks) {
      if (inDegree.get(task.id) === 0) {
        queue.push(task.id);
      }
    }

    const result: Task[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      result.push(taskMap.get(currentId)!);

      const dependents = dependentsMap.get(currentId) || [];
      for (const depId of dependents) {
        const newDegree = (inDegree.get(depId) || 0) - 1;
        inDegree.set(depId, newDegree);
        if (newDegree === 0) {
          queue.push(depId);
        }
      }
    }

    if (result.length !== tasks.length) {
      const remaining = tasks
        .filter((t) => !result.some((r) => r.id === t.id))
        .map((t) => t.id);
      throw new Error(
        `Circular dependency detected in tasks: ${remaining.join(', ')}`
      );
    }

    return result;
  }
}
