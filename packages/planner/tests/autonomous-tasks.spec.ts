import { describe, it, expect, beforeEach } from 'vitest';
import {
  TaskManager,
  ExecutionPlan,
  SafetyValidator,
} from '../src';

describe('Autonomous Task Manager (AGENT-002)', () => {
  let manager: TaskManager;
  let savedMemories: any[] = [];

  const mockMemory: any = {
    save: async (record: any) => {
      savedMemories.push(record);
      return record;
    },
    recall: async () => null,
  };

  beforeEach(() => {
    savedMemories = [];
    manager = new TaskManager({ memory: mockMemory });
  });

  describe('Task Creation and Step Decomposition', () => {
    it('creates a task from an ExecutionPlan', () => {
      const plan: ExecutionPlan = {
        id: 'plan-1',
        steps: [
          { id: 's1', action: 'OPEN_APPLICATION', parameters: { target: 'chrome' } },
          { id: 's2', action: 'NAVIGATE', parameters: { url: 'https://github.com' } },
        ],
      };

      const task = manager.createTask('GitHub\'a git', plan);

      expect(task.id).toBeDefined();
      expect(task.goal).toBe('GitHub\'a git');
      expect(task.status).toBe('pending');
      expect(task.steps).toHaveLength(2);
      expect(task.steps[0].action).toBe('OPEN_APPLICATION');
      expect(task.steps[1].action).toBe('NAVIGATE');
      expect(manager.getTask(task.id)).toBeDefined();
    });
  });

  describe('Sequential Execution & Progress', () => {
    it('evaluates and executes next step autonomously when safe', async () => {
      const plan: ExecutionPlan = {
        id: 'plan-search',
        steps: [
          { id: 'step-1', action: 'OPEN_APPLICATION', parameters: { target: 'chrome' } },
          { id: 'step-2', action: 'NAVIGATE', parameters: { url: 'https://google.com' } },
        ],
      };

      const task = manager.createTask('Google\'da ara', plan);

      // Step 1 evaluation
      const decision1 = await manager.evaluateNextStep(task.id);
      expect(decision1.type).toBe('EXECUTE_NEXT');
      expect(decision1.requiresUserConfirmation).toBe(false);
      expect(decision1.plan?.steps[0].action).toBe('OPEN_APPLICATION');

      // Advance step 1
      await manager.advanceStep(task.id, { pid: 1234 });
      expect(task.currentStepIndex).toBe(1);
      expect(task.steps[0].completed).toBe(true);

      // Step 2 evaluation
      const decision2 = await manager.evaluateNextStep(task.id);
      expect(decision2.type).toBe('EXECUTE_NEXT');
      expect(decision2.plan?.steps[0].action).toBe('NAVIGATE');

      // Advance step 2 -> completion
      await manager.advanceStep(task.id, { loaded: true });
      expect(task.status).toBe('completed');
      expect(task.steps[1].completed).toBe(true);
    });
  });

  describe('Waiting State & Safety Confirmation Rules', () => {
    it('requires confirmation before high-impact PR merge (Example 1)', async () => {
      const plan: ExecutionPlan = {
        id: 'pr-merge-plan',
        steps: [
          { id: 's1', action: 'NAVIGATE', parameters: { url: 'https://github.com/repo/pull/42' } },
          { id: 's2', action: 'QUERY_DOM', parameters: { role: 'button', text: 'Merge' } },
          { id: 's3', action: 'MERGE_PR', parameters: { prNumber: 42 } },
        ],
      };

      const task = manager.createTask('Son PR\'ı merge et', plan);

      // Advance s1 and s2
      await manager.advanceStep(task.id);
      await manager.advanceStep(task.id);

      // S3 is MERGE_PR -> Safety rule triggers
      const decision = await manager.evaluateNextStep(task.id);
      expect(decision.type).toBe('REQUEST_CONFIRMATION');
      expect(decision.requiresUserConfirmation).toBe(true);
      expect(decision.proposalMessage).toContain('merge');

      const currentTask = manager.getTask(task.id)!;
      expect(currentTask.status).toBe('waiting');
      expect(manager.getWaitingTasks()).toContain(currentTask);

      // Confirm step
      await manager.confirmStep(task.id);
      expect(currentTask.status).toBe('running');

      // Complete
      await manager.advanceStep(task.id);
      expect(currentTask.status).toBe('completed');
    });

    it('requires confirmation before sending email (Example 3)', async () => {
      const plan: ExecutionPlan = {
        id: 'mail-plan',
        steps: [
          { id: 's1', action: 'OPEN_APPLICATION', parameters: { target: 'outlook' } },
          { id: 's2', action: 'SEND_MAIL', parameters: { to: 'support@example.com', body: 'Issue resolved' } },
        ],
      };

      const task = manager.createTask('Destek mailini yanıtla', plan);
      await manager.advanceStep(task.id);

      const decision = await manager.evaluateNextStep(task.id);
      expect(decision.type).toBe('REQUEST_CONFIRMATION');
      expect(decision.requiresUserConfirmation).toBe(true);
      expect(decision.proposalMessage).toContain('Mail');
    });

    it('requires confirmation for destructive command line actions', () => {
      expect(SafetyValidator.requiresConfirmation('RUN_COMMAND', { command: 'rm -rf /' })).toBe(true);
      expect(SafetyValidator.requiresConfirmation('RUN_COMMAND', { command: 'git reset --hard HEAD~1' })).toBe(true);
      expect(SafetyValidator.requiresConfirmation('RUN_COMMAND', { command: 'npm test' })).toBe(false);
      expect(SafetyValidator.requiresConfirmation('DELETE_FILE', { path: 'file.txt' })).toBe(true);
    });
  });

  describe('Interruption and Resume (Example 2)', () => {
    it('interrupts running workflow and resumes next step', async () => {
      const plan: ExecutionPlan = {
        id: 'proposal-plan',
        steps: [
          { id: 's1', action: 'OPEN_APPLICATION', parameters: { target: 'word' } },
          { id: 's2', action: 'OPEN_FILE', parameters: { path: 'D:\\PizzaBomb\\teklif.docx' } },
          { id: 's3', action: 'TYPE_TEXT', parameters: { text: 'Bölüm 2: Maliyet' } },
        ],
      };

      const task = manager.createTask('Pizza Bomb teklifini hazırla', plan);
      await manager.advanceStep(task.id); // word opened

      // Interrupted
      manager.interruptTask(task.id);
      expect(task.status).toBe('waiting');
      expect(task.waitingReason).toBe('Interrupted by user');

      // Resume
      const resumeDecision = await manager.resumeTask(task.id);
      expect(task.status).toBe('running');
      expect(resumeDecision.type).toBe('EXECUTE_NEXT');
      expect(resumeDecision.plan?.steps[0].action).toBe('OPEN_FILE');
    });
  });

  describe('Failure and Retry', () => {
    it('marks task failed on error and supports retry', async () => {
      const plan: ExecutionPlan = {
        id: 'fail-test',
        steps: [
          { id: 's1', action: 'NAVIGATE', parameters: { url: 'https://network.down' } },
        ],
      };

      const task = manager.createTask('Network test', plan);
      manager.failTask(task.id, 'Connection refused');

      expect(task.status).toBe('failed');
      expect(task.steps[0].error).toBe('Connection refused');

      const retryDecision = await manager.retryTask(task.id);
      expect(task.status).toBe('running');
      expect(retryDecision.type).toBe('EXECUTE_NEXT');
    });
  });

  describe('Memory Integration', () => {
    it('archives completed task to long-term memory', async () => {
      const plan: ExecutionPlan = {
        id: 'completed-plan',
        steps: [
          { id: 's1', action: 'OPEN_APPLICATION', parameters: { target: 'notepad' } },
        ],
      };

      const task = manager.createTask('Pizza Bomb Proposal', plan);
      await manager.advanceStep(task.id);

      expect(task.status).toBe('completed');
      expect(savedMemories.length).toBe(1);
      expect(savedMemories[0].category).toBe('learned_behaviors');
      expect(savedMemories[0].title).toContain('Pizza Bomb Proposal');
      expect(savedMemories[0].tags).toContain('completed');
    });
  });
});
