import { describe, it, expect, vi } from 'vitest';
import {
  CommandPipeline,
  DefaultWindowsProviderMock,
  DefaultCaptureProviderMock,
  DefaultOcrProviderMock,
  runCli,
} from '../src/pipeline';

describe('E2E Command Pipeline', () => {
  it('Read Screen', async () => {
    const logs: string[] = [];
    const pipeline = new CommandPipeline({
      outputLogger: (msg) => logs.push(msg),
    });

    const result = await pipeline.executeCommand('Read Screen');

    expect(result.success).toBe(true);
    const combined = logs.join('');
    expect(combined).toContain('Kai >');
    expect(combined).toContain('Read Screen');
    expect(combined).toContain('Capturing screen...');
    expect(combined).toContain('OCR...');
    expect(combined).toContain('Detected text:');
    expect(combined).toContain('Google Chrome');
    expect(combined).toContain('GitHub');
    expect(combined).toContain('Merge pull request');
    expect(combined).toContain('Done.');
  });

  it('List Windows', async () => {
    const logs: string[] = [];
    const pipeline = new CommandPipeline({
      outputLogger: (msg) => logs.push(msg),
    });

    const result = await pipeline.executeCommand('List Windows');

    expect(result.success).toBe(true);
    const combined = logs.join('');
    expect(combined).toContain('Kai >');
    expect(combined).toContain('List Windows');
    expect(combined).toContain('Enumerating windows...');
    expect(combined).toContain('Google Chrome (chrome.exe)');
    expect(combined).toContain('Visual Studio Code (Code.exe)');
    expect(combined).toContain('Done.');
  });

  it('Capture Screen', async () => {
    const logs: string[] = [];
    const pipeline = new CommandPipeline({
      outputLogger: (msg) => logs.push(msg),
    });

    const result = await pipeline.executeCommand('Capture Screen');

    expect(result.success).toBe(true);
    const combined = logs.join('');
    expect(combined).toContain('Kai >');
    expect(combined).toContain('Capture Screen');
    expect(combined).toContain('Capturing screen...');
    expect(combined).toContain('Screen captured: 1920x1080');
    expect(combined).toContain('Done.');
  });

  it('Unknown command', async () => {
    const logs: string[] = [];
    const pipeline = new CommandPipeline({
      outputLogger: (msg) => logs.push(msg),
    });

    const result = await pipeline.executeCommand('Random Invalid Action');

    expect(result.success).toBe(false);
    const combined = logs.join('');
    expect(combined).toContain('Unknown command: "Random Invalid Action"');
    expect(combined).toContain('Done.');
  });

  it('Planner + Execution integration', async () => {
    const customOcr = new DefaultOcrProviderMock(['Task 1 Output', 'Task 2 Output']);
    const customCapture = new DefaultCaptureProviderMock();
    const logs: string[] = [];

    const result = await runCli('Read Screen', {
      ocrProvider: customOcr,
      captureProvider: customCapture,
      outputLogger: (msg) => logs.push(msg),
    });

    expect(result.success).toBe(true);
    const combined = logs.join('');
    expect(combined).toContain('Task 1 Output');
    expect(combined).toContain('Task 2 Output');
  });

  it('Engine integration error handling', async () => {
    const failingCapture = {
      async captureScreen() {
        throw new Error('Display device unavailable');
      },
    };
    const logs: string[] = [];

    const pipeline = new CommandPipeline({
      captureProvider: failingCapture,
      outputLogger: (msg) => logs.push(msg),
    });

    const result = await pipeline.executeCommand('Read Screen');

    expect(result.success).toBe(false);
    const combined = logs.join('');
    expect(combined).toContain('Execution error: Display device unavailable');
  });
});
