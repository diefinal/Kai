import { RetryPolicyType } from '../verification/VerificationStrategy';
import { VerificationResult } from '../verification/VerificationResult';

export class WorkflowContext {
  public data: Record<string, any> = {};
  public browserState?: any;
  public desktopState?: any;
  public visionState?: any;
}

export class ExecutionStep {
  public dependsOn?: string[];
  public action?: string;
  public parameters?: Record<string, unknown>;
  public expectedState?: Record<string, unknown>;
  public context?: any;
  public customCheck?: (ctx: any) => Promise<boolean | VerificationResult> | boolean | VerificationResult;
  public verify?: (ctx: any) => Promise<boolean | VerificationResult> | boolean | VerificationResult;
  public timeout?: number;
  public retryPolicy?: RetryPolicyType;

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
      expectedState?: Record<string, unknown>;
      context?: any;
      customCheck?: (ctx: any) => Promise<boolean | VerificationResult> | boolean | VerificationResult;
      verify?: (ctx: any) => Promise<boolean | VerificationResult> | boolean | VerificationResult;
      timeout?: number;
      retryPolicy?: RetryPolicyType;
    }
  ) {
    this.dependsOn = options?.dependsOn;
    this.action = options?.action || toolName;
    this.parameters = options?.parameters || payload;
    this.expectedState = options?.expectedState;
    this.context = options?.context;
    this.customCheck = options?.customCheck;
    this.verify = options?.verify;
    this.timeout = options?.timeout;
    this.retryPolicy = options?.retryPolicy;
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
