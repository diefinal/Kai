export interface ExecutionResult {
  success: boolean;
  completedTasks: number;
  failedTask?: string;
  durationMs: number;
}
