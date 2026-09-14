import { PlanStep } from './PlanStep';

export interface ExecutionPlan {
  id: string;
  steps: PlanStep[];
}

export function serializePlan(plan: ExecutionPlan): string {
  return JSON.stringify(plan, null, 2);
}

export function deserializePlan(json: string): ExecutionPlan {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON: expected ExecutionPlan object');
  }
  return parsed as ExecutionPlan;
}
