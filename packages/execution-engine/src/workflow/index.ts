export class WorkflowContext {
  public data: Record<string, any> = {};
}

export class ExecutionStep {
  public dependsOn?: string[];
  public action?: string;
  public parameters?: Record<string, unknown>;

  constructor(
    public id: string,
    public toolName: string,
    public payload: any,
    public requiresPermission: boolean = false,
    public maxRetries: number = 0,
    options?: {
      dependsOn?: string[];
      action?: string;
      parameters?: Record<string, unknown>;
    }
  ) {
    this.dependsOn = options?.dependsOn;
    this.action = options?.action || toolName;
    this.parameters = options?.parameters || payload;
  }
}

export class ExecutionPlan {
  constructor(
    public id: string,
    public steps: ExecutionStep[],
    public context: WorkflowContext = new WorkflowContext()
  ) {}

  static fromPlan(plan: {
    id: string;
    steps: Array<{
      id: string;
      action: string;
      parameters: Record<string, unknown>;
      dependsOn?: string[];
    }>;
  }): ExecutionPlan {
    const steps = plan.steps.map(
      (s) =>
        new ExecutionStep(s.id, s.action, s.parameters, false, 0, {
          dependsOn: s.dependsOn,
          action: s.action,
          parameters: s.parameters,
        })
    );
    return new ExecutionPlan(plan.id, steps);
  }
}

export class StepResult {
  constructor(
    public success: boolean,
    public output?: any,
    public error?: string
  ) {}
}
