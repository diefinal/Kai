import { describe, it, expect } from 'vitest';
import { ActionSelector } from '../src/reasoning/ActionSelector';
import { ReasoningEngine } from '../src/reasoning/ReasoningEngine';
import { AnalyzedGoal, ToolRegistryLike } from '../src/reasoning/ReasoningTypes';

describe('Planner Dynamic Tool Registry Integration (TOOL-001)', () => {
  it('discovers and selects tools dynamically from registry by capability or ID', () => {
    const mockRegistry: ToolRegistryLike = {
      list: () => [
        {
          id: 'custom.fetch_stock',
          name: 'fetch_stock_price',
          category: 'system',
          capabilities: ['fetch_stock'],
          confirmationRequired: false,
        },
      ],
      find: (id: string) => (id === 'custom.fetch_stock' ? {} : undefined),
      findByCategory: () => [],
    };

    const selector = new ActionSelector(mockRegistry);
    const analyzed: AnalyzedGoal = {
      rawGoal: 'Fetch stock price',
      category: 'system',
      primaryAction: 'fetch_stock',
      subGoals: ['fetch_stock'],
      isSensitive: false,
      language: 'en',
    };

    const candidates = selector.selectActions(analyzed);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].action).toBe('custom.fetch_stock');
    expect(candidates[0].phase).toBe('execution');
  });

  it('works seamlessly in ReasoningEngine with injected registry', () => {
    const mockRegistry: ToolRegistryLike = {
      list: () => [
        {
          id: 'mcp.weather_lookup',
          name: 'lookup_weather',
          category: 'system',
          capabilities: ['lookup_weather'],
          confirmationRequired: false,
        },
      ],
      find: (id: string) => (id === 'mcp.weather_lookup' ? {} : undefined),
      findByCategory: () => [],
    };

    const engine = new ReasoningEngine(undefined, new ActionSelector(mockRegistry), undefined, undefined, mockRegistry);
    expect(engine).toBeDefined();
    const strategy = engine.reason('lookup_weather');
    expect(strategy).toBeDefined();
    expect(strategy.steps.length).toBeGreaterThan(0);
  });
});
