import { ExecutionPlan } from './ExecutionPlan';
import { PlanStep } from './PlanStep';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class PlanValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Plan validation failed: ${errors.join('; ')}`);
    this.name = 'PlanValidationError';
  }
}

export class PlanValidator {
  validate(plan: ExecutionPlan): ValidationResult {
    const errors: string[] = [];

    if (!plan || typeof plan !== 'object') {
      return { valid: false, errors: ['Plan must be a non-null object'] };
    }

    if (!plan.id || typeof plan.id !== 'string' || plan.id.trim().length === 0) {
      errors.push('Plan must have a non-empty string id');
    }

    if (!Array.isArray(plan.steps)) {
      errors.push('Plan steps must be an array');
      return { valid: false, errors };
    }

    const stepIdSet = new Set<string>();
    const stepIndices = new Map<string, number>();

    // Check step identity and parameters
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      if (!step || typeof step !== 'object') {
        errors.push(`Step at index ${i} must be a non-null object`);
        continue;
      }

      if (!step.id || typeof step.id !== 'string' || step.id.trim().length === 0) {
        errors.push(`Step at index ${i} must have a non-empty string id`);
      } else if (stepIdSet.has(step.id)) {
        errors.push(`Duplicate step id: "${step.id}"`);
      } else {
        stepIdSet.add(step.id);
        stepIndices.set(step.id, i);
      }

      if (!step.action || typeof step.action !== 'string' || step.action.trim().length === 0) {
        errors.push(`Step "${step.id || i}" must have a non-empty action`);
      }

      if (step.parameters === null || typeof step.parameters !== 'object' || Array.isArray(step.parameters)) {
        errors.push(`Step "${step.id || i}" parameters must be an object`);
      }
    }

    // Check dependencies
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (!step || !step.id || !step.dependsOn) continue;

      if (!Array.isArray(step.dependsOn)) {
        errors.push(`Step "${step.id}" dependsOn must be an array`);
        continue;
      }

      for (const depId of step.dependsOn) {
        if (typeof depId !== 'string' || depId.trim().length === 0) {
          errors.push(`Step "${step.id}" has invalid dependency id`);
          continue;
        }

        if (depId === step.id) {
          errors.push(`Step "${step.id}" cannot depend on itself`);
          continue;
        }

        if (!stepIdSet.has(depId)) {
          errors.push(`Step "${step.id}" depends on non-existent step "${depId}"`);
          continue;
        }

        const depIndex = stepIndices.get(depId);
        if (depIndex !== undefined && depIndex >= i) {
          errors.push(`Step "${step.id}" depends on future or same-level step "${depId}", violating execution order`);
        }
      }
    }

    // Cycle detection using DFS
    const cycleErrors = this.detectCycles(plan.steps);
    errors.push(...cycleErrors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  assertValid(plan: ExecutionPlan): void {
    const result = this.validate(plan);
    if (!result.valid) {
      throw new PlanValidationError(result.errors);
    }
  }

  private detectCycles(steps: PlanStep[]): string[] {
    const adj = new Map<string, string[]>();
    for (const step of steps) {
      if (step && step.id) {
        adj.set(step.id, step.dependsOn || []);
      }
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycleErrors: string[] = [];

    const dfs = (node: string, path: string[]) => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path, neighbor]);
        } else if (recursionStack.has(neighbor)) {
          cycleErrors.push(`Circular dependency detected: ${[...path, neighbor].join(' -> ')}`);
        }
      }

      recursionStack.delete(node);
    };

    for (const step of steps) {
      if (step && step.id && !visited.has(step.id)) {
        dfs(step.id, [step.id]);
      }
    }

    return cycleErrors;
  }
}
