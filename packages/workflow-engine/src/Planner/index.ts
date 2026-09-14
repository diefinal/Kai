export interface WorkflowStep {
  id: string;
  name: string;
  action: () => Promise<{ success: boolean; output?: string; error?: string }>;
  canRetry?: boolean;
  maxRetries?: number;
}

export interface WorkflowPlan {
  goal: string;
  steps: WorkflowStep[];
}

export class MultiStepPlanner {
  public createPlan(goal: string, steps: WorkflowStep[]): WorkflowPlan {
    return {
      goal,
      steps
    };
  }

  public decomposeStandardGoal(goal: string): string[] {
    if (goal.toLowerCase().includes('pavo') || goal.toLowerCase().includes('test et')) {
      return [
        'Read project',
        'Open repository',
        'Build',
        'Run tests',
        'Open application',
        'Execute scenario',
        'Collect logs',
        'Verify result',
        'Summarize'
      ];
    }
    return ['Understand objective', 'Plan', 'Execute', 'Verify'];
  }
}
