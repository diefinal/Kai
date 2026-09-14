import { describe, it, expect } from 'vitest';
import {
  Planner,
  PlanValidator,
  PlanValidationError,
  serializePlan,
  deserializePlan,
  ExecutionPlan,
  PlanStep,
} from '../src';
import { PlanBuilder } from '../src/plans';

describe('Multi-Step Task Planner (PLAN-007)', () => {
  const planner = new Planner();
  const validator = new PlanValidator();

  describe('Single-Step Plans', () => {
    it('creates a single-step plan for Chrome launch', () => {
      const plan = planner.plan("Chrome'u aç");
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].id).toBe('step-1');
      expect(plan.steps[0].action).toBe('OPEN_APPLICATION');
      expect(plan.steps[0].parameters.target).toBe('chrome');
      expect(plan.steps[0].dependsOn).toEqual([]);
    });

    it('creates a single-step plan for screen reading in English', () => {
      const plan = planner.plan('Read screen');
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].id).toBe('step-1');
      expect(plan.steps[0].action).toBe('READ_SCREEN');
      expect(plan.steps[0].dependsOn).toEqual([]);
    });

    it('handles empty input with zero steps', () => {
      const plan = planner.plan('');
      expect(plan.steps).toHaveLength(0);
      expect(validator.validate(plan).valid).toBe(true);
    });
  });

  describe('Two-Step Plans (Prompt Examples)', () => {
    it('decomposes "Chrome\'u aç ve GitHub\'a git."', () => {
      const plan = planner.plan("Chrome'u aç ve GitHub'a git.");
      expect(plan.steps).toHaveLength(2);

      // Step 1: OPEN_APPLICATION(chrome)
      expect(plan.steps[0].id).toBe('step-1');
      expect(plan.steps[0].action).toBe('OPEN_APPLICATION');
      expect(plan.steps[0].parameters.target).toBe('chrome');
      expect(plan.steps[0].dependsOn).toEqual([]);

      // Step 2: NAVIGATE("https://github.com")
      expect(plan.steps[1].id).toBe('step-2');
      expect(plan.steps[1].action).toBe('NAVIGATE');
      expect(plan.steps[1].parameters.url).toBe('https://github.com');
      expect(plan.steps[1].dependsOn).toEqual(['step-1']);
    });

    it('decomposes "VS Code\'u aç ve D:\\Kai klasörünü aç."', () => {
      const plan = planner.plan('VS Code\'u aç ve D:\\Kai klasörünü aç.');
      expect(plan.steps).toHaveLength(2);

      // Step 1: OPEN_APPLICATION(vscode)
      expect(plan.steps[0].id).toBe('step-1');
      expect(plan.steps[0].action).toBe('OPEN_APPLICATION');
      expect(plan.steps[0].parameters.target).toBe('vscode');
      expect(plan.steps[0].dependsOn).toEqual([]);

      // Step 2: OPEN_FOLDER("D:\\Kai")
      expect(plan.steps[1].id).toBe('step-2');
      expect(plan.steps[1].action).toBe('OPEN_FOLDER');
      expect(plan.steps[1].parameters.path).toBe('D:\\Kai');
      expect(plan.steps[1].dependsOn).toEqual(['step-1']);
    });

    it('decomposes Not Defteri opening and typing', () => {
      const plan = planner.plan('Not Defteri\'ni aç ve "Merhaba Dünya" yaz.');
      expect(plan.steps).toHaveLength(2);

      // Step 1: OPEN_APPLICATION(notepad)
      expect(plan.steps[0].id).toBe('step-1');
      expect(plan.steps[0].action).toBe('OPEN_APPLICATION');
      expect(plan.steps[0].parameters.target).toBe('notepad');
      expect(plan.steps[0].dependsOn).toEqual([]);

      // Step 2: TYPE_TEXT("Merhaba Dünya")
      expect(plan.steps[1].id).toBe('step-2');
      expect(plan.steps[1].action).toBe('TYPE_TEXT');
      expect(plan.steps[1].parameters.text).toBe('Merhaba Dünya');
      expect(plan.steps[1].dependsOn).toEqual(['step-1']);
    });

    it('preserves conjunction words inside quoted text without splitting', () => {
      const plan = planner.plan('Not Defteri\'ni aç ve "Merhaba Dünya ve Kai" yaz.');
      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0].action).toBe('OPEN_APPLICATION');
      expect(plan.steps[1].action).toBe('TYPE_TEXT');
      expect(plan.steps[1].parameters.text).toBe('Merhaba Dünya ve Kai');
    });
  });

  describe('Three-Step Plans', () => {
    it('decomposes compound 3-step action correctly', () => {
      const plan = planner.plan("Chrome'u aç, GitHub'a git ve ekran görüntüsü al.");
      expect(plan.steps).toHaveLength(3);

      expect(plan.steps[0].id).toBe('step-1');
      expect(plan.steps[0].action).toBe('OPEN_APPLICATION');
      expect(plan.steps[0].parameters.target).toBe('chrome');
      expect(plan.steps[0].dependsOn).toEqual([]);

      expect(plan.steps[1].id).toBe('step-2');
      expect(plan.steps[1].action).toBe('NAVIGATE');
      expect(plan.steps[1].parameters.url).toBe('https://github.com');
      expect(plan.steps[1].dependsOn).toEqual(['step-1']);

      expect(plan.steps[2].id).toBe('step-3');
      expect(plan.steps[2].action).toBe('CAPTURE_SCREEN');
      expect(plan.steps[2].dependsOn).toEqual(['step-2']);
    });

    it('builds a 3-step plan programmatically using PlanBuilder', () => {
      const builder = new PlanBuilder('custom-3-step');
      builder
        .addStep('OPEN_APPLICATION', { target: 'notepad' })
        .addSequentialStep('TYPE_TEXT', { text: 'Testing 1 2 3' })
        .addSequentialStep('PRESS_KEY', { key: 'Enter' });

      const plan = builder.build();
      expect(plan.id).toBe('custom-3-step');
      expect(plan.steps).toHaveLength(3);
      expect(plan.steps[0].dependsOn).toEqual([]);
      expect(plan.steps[1].dependsOn).toEqual(['step-1']);
      expect(plan.steps[2].dependsOn).toEqual(['step-2']);
    });
  });

  describe('Dependency Validation', () => {
    it('validates correct linear plan without errors', () => {
      const plan: ExecutionPlan = {
        id: 'valid-plan',
        steps: [
          { id: 's1', action: 'OPEN_APPLICATION', parameters: { target: 'chrome' }, dependsOn: [] },
          { id: 's2', action: 'NAVIGATE', parameters: { url: 'https://github.com' }, dependsOn: ['s1'] },
        ],
      };

      const result = validator.validate(plan);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(() => validator.assertValid(plan)).not.toThrow();
    });

    it('rejects missing or non-existent dependency', () => {
      const plan: ExecutionPlan = {
        id: 'missing-dep-plan',
        steps: [
          { id: 's1', action: 'OPEN_APPLICATION', parameters: {}, dependsOn: [] },
          { id: 's2', action: 'NAVIGATE', parameters: {}, dependsOn: ['non-existent-step'] },
        ],
      };

      const result = validator.validate(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('non-existent step'))).toBe(true);
      expect(() => validator.assertValid(plan)).toThrow(PlanValidationError);
    });

    it('rejects self-dependency', () => {
      const plan: ExecutionPlan = {
        id: 'self-dep-plan',
        steps: [
          { id: 's1', action: 'OPEN_APPLICATION', parameters: {}, dependsOn: ['s1'] },
        ],
      };

      const result = validator.validate(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('cannot depend on itself'))).toBe(true);
    });

    it('rejects forward dependency violating execution order', () => {
      const plan: ExecutionPlan = {
        id: 'forward-dep-plan',
        steps: [
          { id: 's1', action: 'OPEN_APPLICATION', parameters: {}, dependsOn: ['s2'] },
          { id: 's2', action: 'NAVIGATE', parameters: {}, dependsOn: [] },
        ],
      };

      const result = validator.validate(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('violating execution order'))).toBe(true);
    });

    it('rejects circular dependencies', () => {
      const plan: ExecutionPlan = {
        id: 'circular-dep-plan',
        steps: [
          { id: 's1', action: 'A', parameters: {}, dependsOn: ['s3'] },
          { id: 's2', action: 'B', parameters: {}, dependsOn: ['s1'] },
          { id: 's3', action: 'C', parameters: {}, dependsOn: ['s2'] },
        ],
      };

      const result = validator.validate(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Circular dependency'))).toBe(true);
    });

    it('rejects duplicate step IDs', () => {
      const plan: ExecutionPlan = {
        id: 'dup-id-plan',
        steps: [
          { id: 'step-1', action: 'A', parameters: {} },
          { id: 'step-1', action: 'B', parameters: {} },
        ],
      };

      const result = validator.validate(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate step id'))).toBe(true);
    });
  });

  describe('Serialization and Deserialization', () => {
    it('serializes and deserializes an ExecutionPlan to and from JSON', () => {
      const originalPlan: ExecutionPlan = {
        id: 'plan-json-test',
        steps: [
          {
            id: 'step-1',
            action: 'OPEN_APPLICATION',
            parameters: { target: 'vscode' },
            dependsOn: [],
          },
          {
            id: 'step-2',
            action: 'OPEN_FOLDER',
            parameters: { path: 'D:\\Kai' },
            dependsOn: ['step-1'],
          },
        ],
      };

      const jsonString = serializePlan(originalPlan);
      expect(typeof jsonString).toBe('string');
      expect(jsonString).toContain('OPEN_APPLICATION');
      expect(jsonString).toContain('OPEN_FOLDER');

      const restoredPlan = deserializePlan(jsonString);
      expect(restoredPlan).toEqual(originalPlan);
      expect(validator.validate(restoredPlan).valid).toBe(true);
    });

    it('supports future conditional branches in steps and remains serializable', () => {
      const branchStep: PlanStep = {
        id: 'step-conditional',
        action: 'NAVIGATE',
        parameters: { url: 'https://github.com' },
        dependsOn: [],
        condition: {
          type: 'expression',
          field: 'isLoggedIn',
          operator: '==',
          value: true,
        },
      };

      const plan: ExecutionPlan = {
        id: 'conditional-plan',
        steps: [branchStep],
      };

      const json = serializePlan(plan);
      const deserialized = deserializePlan(json);
      expect(deserialized.steps[0].condition).toEqual({
        type: 'expression',
        field: 'isLoggedIn',
        operator: '==',
        value: true,
      });
      expect(validator.validate(deserialized).valid).toBe(true);
    });
  });
});
