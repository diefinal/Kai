import { IntentRecognizer } from './nlu/IntentRecognizer';
import { ExecutionPlan } from './plans/ExecutionPlan';
import { PlanStep } from './plans/PlanStep';
import { PlanValidator } from './plans/PlanValidator';
import { PlanBuilder } from './plans/PlanBuilder';

export interface ConversationContextLike {
  currentApplication?(): string | null;
  currentWindow?(): { id?: string; title: string; processName?: string } | null;
  currentBrowser?(): { browserName: string; currentUrl?: string } | null;
  lastVisionResult?(): { ocrLines?: string[]; detectedText?: string; timestamp?: number } | null;
  lastExecutionPlan?(): unknown | null;
  lastExecutedAction?(): unknown | null;
  currentLanguage?(): 'tr' | 'en';
}

export interface PlannerOptions {
  recognizer?: IntentRecognizer;
  validator?: PlanValidator;
}

export interface PlanOptions {
  id?: string;
  context?: ConversationContextLike;
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

  plan(
    input: string,
    contextOrOptions?: ConversationContextLike | PlanOptions
  ): ExecutionPlan {
    const raw = input.trim();

    let planId: string | undefined;
    let context: ConversationContextLike | undefined;

    if (contextOrOptions) {
      if ('currentApplication' in contextOrOptions || 'lastVisionResult' in contextOrOptions) {
        context = contextOrOptions as ConversationContextLike;
      } else {
        const opts = contextOrOptions as PlanOptions;
        planId = opts.id;
        context = opts.context;
      }
    }

    const resolvedPlanId =
      planId || `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (!raw) {
      const emptyPlan: ExecutionPlan = {
        id: resolvedPlanId,
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

      this.enrichStepWithContext(step, clause, context);

      steps.push(step);
    }

    const plan: ExecutionPlan = {
      id: resolvedPlanId,
      steps,
    };

    this.validator.assertValid(plan);
    return plan;
  }

  private enrichStepWithContext(
    step: PlanStep,
    clause: string,
    context?: ConversationContextLike
  ): void {
    if (!context) return;

    const lower = clause.toLowerCase();

    // 1. Window control reference resolution ("bu pencereyi büyüt", "pencereyi kapat")
    if (
      step.action === 'MAXIMIZE_WINDOW' ||
      step.action === 'MINIMIZE_WINDOW' ||
      step.action === 'CLOSE_WINDOW' ||
      step.action === 'BRING_TO_FRONT'
    ) {
      if (!step.parameters.target) {
        const app =
          context.currentApplication?.() ||
          context.currentWindow?.()?.processName ||
          context.currentWindow?.()?.title;
        if (app) {
          step.parameters.target = app;
        }
      }
    }

    // 2. Navigation reference resolution (GitHub'a git -> Chrome session)
    if (step.action === 'NAVIGATE') {
      if (!step.parameters.browser) {
        const browser =
          context.currentBrowser?.()?.browserName ||
          (context.currentApplication?.() === 'chrome' ||
          context.currentApplication?.() === 'edge'
            ? context.currentApplication?.()
            : undefined);
        if (browser) {
          step.parameters.browser = browser;
        }
      }
    }

    // 3. Vision context reuse ("Burada hata var mı?", "Ne görüyorsun?", "Metni açıkla")
    const lastVision = context.lastVisionResult?.();
    const isVisionQuery =
      /\b(burada|ekranda|metinde|ne\s+görüyorsun|ne\s+var|hata\s+var\s+mı|açıkla|here|on\s+the\s+screen|in\s+the\s+text|what\s+do\s+you\s+see|is\s+there\s+an\s+error)\b/i.test(
        lower
      );

    if (lastVision && (isVisionQuery || step.action === 'READ_SCREEN')) {
      step.action = 'ANALYZE_SCREEN_TEXT';
      step.parameters = {
        ...step.parameters,
        reuseVision: true,
        detectedText: lastVision.detectedText,
        ocrLines: lastVision.ocrLines,
      };
    }
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
