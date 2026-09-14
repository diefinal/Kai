import { ExecutionPlan } from '../plans/ExecutionPlan';
import { GoalAnalyzer } from './GoalAnalyzer';
import { ActionSelector } from './ActionSelector';
import { ConstraintResolver } from './ConstraintResolver';
import { StrategyBuilder } from './StrategyBuilder';
import {
  ConversationContextLike,
  ReasoningContext,
  Strategy,
  ToolRegistryLike,
} from './ReasoningTypes';

export class ReasoningEngine {
  private readonly analyzer: GoalAnalyzer;
  private readonly selector: ActionSelector;
  private readonly resolver: ConstraintResolver;
  private readonly builder: StrategyBuilder;
  private readonly toolRegistry?: ToolRegistryLike;

  constructor(
    analyzer: GoalAnalyzer = new GoalAnalyzer(),
    selector?: ActionSelector,
    resolver: ConstraintResolver = new ConstraintResolver(),
    builder: StrategyBuilder = new StrategyBuilder(),
    toolRegistry?: ToolRegistryLike
  ) {
    this.analyzer = analyzer;
    this.toolRegistry = toolRegistry;
    this.selector = selector || new ActionSelector(toolRegistry);
    this.resolver = resolver;
    this.builder = builder;
  }

  getToolRegistry(): ToolRegistryLike | undefined {
    return this.toolRegistry;
  }


  getAnalyzer(): GoalAnalyzer {
    return this.analyzer;
  }

  getActionSelector(): ActionSelector {
    return this.selector;
  }

  getConstraintResolver(): ConstraintResolver {
    return this.resolver;
  }

  getStrategyBuilder(): StrategyBuilder {
    return this.builder;
  }

  private normalizeContext(
    ctx?: ReasoningContext | ConversationContextLike
  ): ReasoningContext | undefined {
    if (!ctx) return undefined;
    if (typeof (ctx as ConversationContextLike).currentApplication === 'function') {
      const fnCtx = ctx as ConversationContextLike;
      return {
        currentApplication: fnCtx.currentApplication?.(),
        currentBrowser: fnCtx.currentBrowser?.(),
        currentWindow: fnCtx.currentWindow?.(),
        currentDomSnapshot: fnCtx.currentDomSnapshot?.(),
        currentLanguage: fnCtx.currentLanguage?.(),
      };
    }
    return ctx as ReasoningContext;
  }

  reason(
    goal: string,
    rawContext?: ReasoningContext | ConversationContextLike
  ): Strategy {
    const context = this.normalizeContext(rawContext);
    const analyzed = this.analyzer.analyze(goal);
    const candidates = this.selector.selectActions(analyzed);
    const { resolvedSteps, requiresConfirmation, confirmationMessage } =
      this.resolver.resolveConstraints(candidates, context, analyzed.language);

    return this.builder.buildStrategy(
      goal,
      resolvedSteps,
      requiresConfirmation,
      confirmationMessage
    );
  }

  generateRecoveryStrategy(
    failedPlan: ExecutionPlan,
    error: Error | string,
    rawContext?: ReasoningContext | ConversationContextLike
  ): Strategy {
    const context = this.normalizeContext(rawContext);
    const errMsg = typeof error === 'string' ? error : error.message;
    const isBrowserError =
      errMsg.toLowerCase().includes('navigation') ||
      errMsg.toLowerCase().includes('tab') ||
      errMsg.toLowerCase().includes('dom') ||
      failedPlan.steps.some((s) => s.action === 'NAVIGATE' || s.action === 'QUERY_DOM');

    const recoveryCandidates = isBrowserError
      ? [
          {
            action: 'RELOAD_PAGE',
            parameters: {},
            phase: 'execution' as const,
          },
          {
            action: 'READ_DOM',
            parameters: {},
            phase: 'verification' as const,
          },
        ]
      : [
          {
            action: 'READ_SCREEN',
            parameters: { fullScreen: true },
            phase: 'execution' as const,
          },
        ];

    const { resolvedSteps } = this.resolver.resolveConstraints(
      recoveryCandidates,
      context,
      context?.currentLanguage || 'tr'
    );

    return this.builder.buildStrategy(
      `Recovery from failure: ${errMsg}`,
      resolvedSteps,
      false
    );
  }

  validateStrategy(strategy: Strategy): boolean {
    if (!strategy.goal) return false;
    if (!Array.isArray(strategy.steps) || strategy.steps.length === 0) return false;
    for (const phase of strategy.steps) {
      if (!phase.id || !Array.isArray(phase.steps)) return false;
      for (const step of phase.steps) {
        if (!step.id || !step.action) return false;
      }
    }
    return true;
  }
}
