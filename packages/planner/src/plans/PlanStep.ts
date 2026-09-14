export interface StepCondition {
  type?: string;
  expression?: string;
  field?: string;
  operator?: string;
  value?: unknown;
}

export interface PlanStep {
  id: string;
  action: string;
  parameters: Record<string, unknown>;
  dependsOn?: string[];
  condition?: StepCondition | string;
}
