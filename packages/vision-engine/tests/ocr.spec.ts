import { describe, it, expect } from 'vitest';
import {
  OcrEngine,
  OcrProvider,
  OcrResult,
  WindowsOcrProvider,
  ImageFrame,
  CapturePipeline,
  CaptureSource,
} from '../src';

class TestableWindowsOcrProvider extends WindowsOcrProvider {
  constructor(private readonly mockJson: string) {
    super();
  }

  protected override async executeOcrScript(): Promise<string> {
    return this.mockJson;
  }
}

describe('OCR Engine Integration', () => {
  const sampleFrame: ImageFrame = {
    width: 800,
    height: 600,
    channels: 4,
    timestamp: Date.now(),
    data: new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]),
  };

  it('OCR returns results for a known sample image', async () => {
    const mockResults = JSON.stringify([
      {
        text: 'Save File',
        confidence: 0.95,
        bounds: { x: 10, y: 20, width: 100, height: 30 },
      },
      {
        text: 'Cancel',
        confidence: 0.88,
        bounds: { x: 120, y: 20, width: 80, height: 30 },
      },
    ]);

    const provider = new TestableWindowsOcrProvider(mockResults);
    const engine = new OcrEngine(provider);

    const results = await engine.recognize(sampleFrame);

    expect(results).toHaveLength(2);
    expect(results[0].text).toBe('Save File');
    expect(results[0].confidence).toBe(0.95);
    expect(results[0].bounds).toEqual({ x: 10, y: 20, width: 100, height: 30 });
    expect(results[1].text).toBe('Cancel');
  });

  it('Empty image returns empty array', async () => {
    const provider = new TestableWindowsOcrProvider('[]');
    const engine = new OcrEngine(provider);

    const emptyFrame: ImageFrame = {
      width: 0,
      height: 0,
      channels: 0,
      timestamp: Date.now(),
      data: new Uint8Array([]),
    };

    const results = await engine.recognize(emptyFrame);
    expect(results).toEqual([]);
  });

  it('Confidence values are between 0 and 1', async () => {
    const mockResults = JSON.stringify([
      {
        text: 'Too High',
        confidence: 1.5,
        bounds: { x: 0, y: 0, width: 50, height: 20 },
      },
      {
        text: 'Negative',
        confidence: -0.2,
        bounds: { x: 0, y: 0, width: 50, height: 20 },
      },
      {
        text: 'Valid',
        confidence: 0.75,
        bounds: { x: 0, y: 0, width: 50, height: 20 },
      },
    ]);

    const provider = new TestableWindowsOcrProvider(mockResults);
    const engine = new OcrEngine(provider);

    const results = await engine.recognize(sampleFrame);

    expect(results).toHaveLength(3);
    for (const res of results) {
      expect(res.confidence).toBeGreaterThanOrEqual(0);
      expect(res.confidence).toBeLessThanOrEqual(1);
    }
    expect(results[0].confidence).toBe(1);
    expect(results[1].confidence).toBe(0);
    expect(results[2].confidence).toBe(0.75);
  });

  it('Provider abstraction works', async () => {
    class CustomOcrProvider implements OcrProvider {
      async recognize(image: ImageFrame): Promise<OcrResult[]> {
        return [
          {
            text: `Custom OCR: ${image.width}x${image.height}`,
            confidence: 0.99,
            bounds: { x: 0, y: 0, width: image.width, height: image.height },
          },
        ];
      }
    }

    const engine = new OcrEngine(new CustomOcrProvider());
    const results = await engine.recognize(sampleFrame);

    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('Custom OCR: 800x600');
    expect(results[0].confidence).toBe(0.99);
  });

  it('Connects to CapturePipeline via recognizeFromPipeline', async () => {
    const mockSource: CaptureSource = {
      async capture(): Promise<ImageFrame> {
        return sampleFrame;
      },
    };
    const capturePipeline = new CapturePipeline(mockSource);

    class MockPipelineOcrProvider implements OcrProvider {
      async recognize(): Promise<OcrResult[]> {
        return [
          {
            text: 'Captured text',
            confidence: 0.92,
            bounds: { x: 5, y: 5, width: 50, height: 15 },
          },
        ];
      }
    }

    const engine = new OcrEngine(new MockPipelineOcrProvider());
    const results = await engine.recognizeFromPipeline(capturePipeline);

    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('Captured text');
    expect(results[0].confidence).toBe(0.92);
  });
});
