import { AgentTask, AgentTaskStatus } from './TaskState';

export class TaskQueue {
  private tasks: Map<string, AgentTask> = new Map();

  enqueue(task: AgentTask): void {
    this.tasks.set(task.id, task);
  }

  dequeue(): AgentTask | undefined {
    const active = this.getActiveTasks();
    if (active.length === 0) return undefined;

    const highest = active[0];
    this.tasks.delete(highest.id);
    return highest;
  }

  peek(): AgentTask | undefined {
    const active = this.getActiveTasks();
    return active.length > 0 ? active[0] : undefined;
  }

  get(id: string): AgentTask | undefined {
    return this.tasks.get(id);
  }

  has(id: string): boolean {
    return this.tasks.has(id);
  }

  remove(id: string): boolean {
    return this.tasks.delete(id);
  }

  getAll(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  getByStatus(status: AgentTaskStatus): AgentTask[] {
    return this.getAll().filter((t) => t.status === status);
  }

  getActiveTasks(): AgentTask[] {
    return this.getAll()
      .filter((t) => t.status === 'pending' || t.status === 'running' || t.status === 'waiting')
      .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());
  }

  size(): number {
    return this.tasks.size;
  }

  clear(): void {
    this.tasks.clear();
  }
}
