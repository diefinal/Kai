import { ExecutionPlan } from './ExecutionPlan';
import { PlanStep, StepCondition } from './PlanStep';
import { PlanValidator } from './PlanValidator';

export interface AddStepOptions {
  id?: string;
  dependsOn?: string[];
  condition?: StepCondition | string;
}

export class PlanBuilder {
  private id: string;
  private steps: PlanStep[] = [];
  private readonly validator: PlanValidator;

  constructor(id?: string, validator: PlanValidator = new PlanValidator()) {
    this.id = id || `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.validator = validator;
  }

  setId(id: string): this {
    this.id = id;
    return this;
  }

  addStep(
    action: string,
    parameters: Record<string, unknown> = {},
    options?: AddStepOptions
  ): this {
    const stepNumber = this.steps.length + 1;
    const stepId = options?.id || `step-${stepNumber}`;

    const step: PlanStep = {
      id: stepId,
      action,
      parameters,
      dependsOn: options?.dependsOn || [],
      condition: options?.condition,
    };

    this.steps.push(step);
    return this;
  }

  addSequentialStep(
    action: string,
    parameters: Record<string, unknown> = {},
    options?: Omit<AddStepOptions, 'dependsOn'>
  ): this {
    const prevStep = this.steps.length > 0 ? this.steps[this.steps.length - 1] : null;
    const dependsOn = prevStep ? [prevStep.id] : [];
    return this.addStep(action, parameters, {
      ...options,
      dependsOn,
    });
  }

  build(validate = true): ExecutionPlan {
    const plan: ExecutionPlan = {
      id: this.id,
      steps: [...this.steps],
    };

    if (validate) {
      this.validator.assertValid(plan);
    }

    return plan;
  }

  static fromSteps(steps: PlanStep[], id?: string, validate = true): ExecutionPlan {
    const builder = new PlanBuilder(id);
    for (const s of steps) {
      builder.steps.push({ ...s });
    }
    return builder.build(validate);
  }
}

export { PlanBuilder as ExecutionPlanBuilder };
