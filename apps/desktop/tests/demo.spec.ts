import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runDemo, CaptureProviderMock, OcrProviderMock } from '../src/demo';

describe('Screen Capture + OCR CLI Demo', () => {
  let logSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints workflow steps and recognized text when OCR finds text', async () => {
    await runDemo({
      captureSource: new CaptureProviderMock(),
      ocrProvider: new OcrProviderMock('Hello Kai from Screen'),
    });

    const calls = logSpy.mock.calls.map((c: any[]) => c.join(' ')).join('\n');

    expect(calls).toContain('[KAI]');
    expect(calls).toContain('Windows Engine initialized');
    expect(calls).toContain('Vision Engine initialized');
    expect(calls).toContain('Capturing screen...');
    expect(calls).toContain('Running OCR...');
    expect(calls).toContain('Detected text:');
    expect(calls).toContain('Hello Kai from Screen');
    expect(calls).toContain('Done.');
  });

  it('prints "No text detected." when OCR finds nothing', async () => {
    const emptyOcrProvider = {
      async recognize() {
        return [];
      },
    };

    await runDemo({
      captureSource: new CaptureProviderMock(),
      ocrProvider: emptyOcrProvider,
    });

    const calls = logSpy.mock.calls.map((c: any[]) => c.join(' ')).join('\n');

    expect(calls).toContain('No text detected.');
    expect(calls).toContain('Done.');
  });

  it('handles errors gracefully without unhandled rejection', async () => {
    const failingOcrProvider = {
      async recognize() {
        throw new Error('OCR Failed simulated');
      },
    };

    await expect(
      runDemo({
        captureSource: new CaptureProviderMock(),
        ocrProvider: failingOcrProvider,
      })
    ).resolves.not.toThrow();

    expect(errorSpy).toHaveBeenCalled();
  });
});
