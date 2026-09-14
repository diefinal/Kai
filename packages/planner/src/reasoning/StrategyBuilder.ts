import { ExecutionPlan } from '../plans/ExecutionPlan';
import { PlanStep } from '../plans/PlanStep';
import { StepCandidate, Strategy } from './ReasoningTypes';

export class StrategyBuilder {
  buildStrategy(
    goal: string,
    candidates: StepCandidate[],
    requiresConfirmation: boolean,
    confirmationMessage?: string
  ): Strategy {
    const plans: ExecutionPlan[] = [];
    let globalStepIndex = 1;

    // Split candidates by phase
    const preconditions = candidates.filter((c) => c.phase === 'precondition');
    const executions = candidates.filter((c) => c.phase === 'execution');
    const verifications = candidates.filter((c) => c.phase === 'verification');

    // Phase 1: Preconditions
    if (preconditions.length > 0) {
      const steps: PlanStep[] = [];
      for (const cand of preconditions) {
        const id = `step-${globalStepIndex++}`;
        const prev = steps.length > 0 ? steps[steps.length - 1] : null;
        steps.push({
          id,
          action: cand.action,
          parameters: { ...cand.parameters },
          dependsOn: prev ? [prev.id] : [],
        });
      }
      plans.push({
        id: `phase-precondition-${Date.now()}`,
        steps,
      });
    }

    // Phase 2: Core Execution
    if (executions.length > 0) {
      const steps: PlanStep[] = [];
      for (const cand of executions) {
        const id = `step-${globalStepIndex++}`;
        const prev = steps.length > 0 ? steps[steps.length - 1] : null;
        steps.push({
          id,
          action: cand.action,
          parameters: { ...cand.parameters },
          dependsOn: prev ? [prev.id] : [],
        });
      }
      plans.push({
        id: `phase-execution-${Date.now()}`,
        steps,
      });
    }

    // Phase 3: Verifications
    if (verifications.length > 0) {
      const steps: PlanStep[] = [];
      for (const cand of verifications) {
        const id = `step-${globalStepIndex++}`;
        const prev = steps.length > 0 ? steps[steps.length - 1] : null;
        steps.push({
          id,
          action: cand.action,
          parameters: { ...cand.parameters },
          dependsOn: prev ? [prev.id] : [],
        });
      }
      plans.push({
        id: `phase-verification-${Date.now()}`,
        steps,
      });
    }

    // If no steps were produced, provide fallback plan
    if (plans.length === 0) {
      plans.push({
        id: `phase-generic-${Date.now()}`,
        steps: [
          {
            id: 'step-1',
            action: 'UNKNOWN',
            parameters: { goal },
          },
        ],
      });
    }

    // Generate Recovery Plan
    const recoveryPlan = this.buildRecoveryPlan(candidates);

    // Calculate Confidence
    const confidence = this.calculateConfidence(candidates);

    return {
      goal,
      steps: plans,
      confidence,
      requiresConfirmation,
      confirmationMessage,
      recoveryPlan,
      toUnifiedPlan(): ExecutionPlan {
        const unifiedSteps: PlanStep[] = [];
        let unifiedIndex = 1;
        for (const phase of plans) {
          for (const s of phase.steps) {
            const id = `step-${unifiedIndex++}`;
            const prev = unifiedSteps.length > 0 ? unifiedSteps[unifiedSteps.length - 1] : null;
            unifiedSteps.push({
              id,
              action: s.action,
              parameters: { ...s.parameters },
              dependsOn: prev ? [prev.id] : [],
            });
          }
        }
        return {
          id: `unified-${Date.now()}`,
          steps: unifiedSteps,
        };
      },
    };
  }

  private buildRecoveryPlan(candidates: StepCandidate[]): ExecutionPlan {
    const isBrowserRelated = candidates.some(
      (c) => c.action === 'NAVIGATE' || c.action === 'QUERY_DOM' || c.action === 'READ_DOM'
    );

    if (isBrowserRelated) {
      return {
        id: `recovery-browser-${Date.now()}`,
        steps: [
          {
            id: 'recovery-step-1',
            action: 'RELOAD_PAGE',
            parameters: {},
          },
          {
            id: 'recovery-step-2',
            action: 'READ_DOM',
            parameters: {},
            dependsOn: ['recovery-step-1'],
          },
        ],
      };
    }

    return {
      id: `recovery-desktop-${Date.now()}`,
      steps: [
        {
          id: 'recovery-step-1',
          action: 'READ_SCREEN',
          parameters: { fullScreen: true },
        },
      ],
    };
  }

  private calculateConfidence(candidates: StepCandidate[]): number {
    if (candidates.length === 0) return 0.2;
    const hasConcreteActions = candidates.every(
      (c) => c.action !== 'UNKNOWN' && c.action !== 'GENERIC_ACTION'
    );
    if (hasConcreteActions) {
      return Math.min(0.95, 0.75 + candidates.length * 0.05);
    }
    return 0.5;
  }
}
