import { IntentRecognizer } from './nlu/IntentRecognizer';
import { ExecutionPlan } from './plans/ExecutionPlan';
import { PlanStep } from './plans/PlanStep';
import { PlanValidator } from './plans/PlanValidator';
import { PlanBuilder } from './plans/PlanBuilder';

export interface PlannerOptions {
  recognizer?: IntentRecognizer;
  validator?: PlanValidator;
}

export interface PlanOptions {
  id?: string;
}

export class Planner {
  private readonly recognizer: IntentRecognizer;
  private readonly validator: PlanValidator;

  constructor(options: PlannerOptions = {}) {
    this.recognizer = options.recognizer || new IntentRecognizer();
    this.validator = options.validator || new PlanValidator();
  }

  getRecognizer(): IntentRecognizer {
    return this.recognizer;
  }

  getValidator(): PlanValidator {
    return this.validator;
  }

  createBuilder(id?: string): PlanBuilder {
    return new PlanBuilder(id, this.validator);
  }

  plan(input: string, options?: PlanOptions): ExecutionPlan {
    const raw = input.trim();
    const planId = options?.id || `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (!raw) {
      const emptyPlan: ExecutionPlan = {
        id: planId,
        steps: [],
      };
      this.validator.assertValid(emptyPlan);
      return emptyPlan;
    }

    const clauses = this.splitClauses(raw);
    const steps: PlanStep[] = [];

    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      const intent = this.recognizer.recognize(clause);

      const stepId = `step-${steps.length + 1}`;
      const prevStep = steps.length > 0 ? steps[steps.length - 1] : null;

      const step: PlanStep = {
        id: stepId,
        action: intent.name,
        parameters: intent.parameters || {},
        dependsOn: prevStep ? [prevStep.id] : [],
      };

      steps.push(step);
    }

    const plan: ExecutionPlan = {
      id: planId,
      steps,
    };

    this.validator.assertValid(plan);
    return plan;
  }

  splitClauses(input: string): string[] {
    const trimmed = input.trim();
    if (!trimmed) return [];

    const clauses: string[] = [];
    let current = '';
    let inDoubleQuote = false;
    let inSingleQuote = false;

    let i = 0;
    while (i < trimmed.length) {
      const ch = trimmed[i];

      if (ch === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        current += ch;
        i++;
        continue;
      }

      if (ch === "'" && !inDoubleQuote) {
        const prevChar = i > 0 ? trimmed[i - 1] : ' ';
        const nextChar = i + 1 < trimmed.length ? trimmed[i + 1] : ' ';
        const isApostrophe = /\w/.test(prevChar) && /\w/.test(nextChar);

        if (!isApostrophe) {
          inSingleQuote = !inSingleQuote;
        }
        current += ch;
        i++;
        continue;
      }

      if (!inDoubleQuote && !inSingleQuote) {
        const remaining = trimmed.substring(i);
        const conjunctionMatch = remaining.match(
          /^(?:(?:\s+(?:ve\s+sonra|daha\s+sonra|ardından|sonra|then|and|ve)\s+)|(?:,\s*(?:ve|and|then)?\s*)|(?:;\s*))/i
        );

        if (conjunctionMatch) {
          const matchLength = conjunctionMatch[0].length;
          const cleaned = current.trim();
          if (cleaned.length > 0) {
            clauses.push(cleaned.replace(/[.]+$/, ''));
          }
          current = '';
          i += matchLength;
          continue;
        }
      }

      current += ch;
      i++;
    }

    const finalCleaned = current.trim().replace(/[.]+$/, '');
    if (finalCleaned.length > 0) {
      clauses.push(finalCleaned);
    }

    return clauses;
  }
}
