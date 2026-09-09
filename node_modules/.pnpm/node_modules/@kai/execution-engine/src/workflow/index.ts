export class WorkflowContext {
  public data: Record<string, any> = {};
}

export class ExecutionStep {
  constructor(
    public id: string,
    public toolName: string,
    public payload: any,
    public requiresPermission: boolean = false,
    public maxRetries: number = 0
  ) {}
}

export class ExecutionPlan {
  constructor(
    public id: string,
    public steps: ExecutionStep[],
    public context: WorkflowContext = new WorkflowContext()
  ) {}
}

export class StepResult {
  constructor(
    public success: boolean,
    public output?: any,
    public error?: string
  ) {}
}
