import { describe, it, expect } from 'vitest';
import {
  CapturePipeline,
  CaptureSource,
  ScreenCaptureSourceAdapter,
  IScreenCaptureSource,
  ScreenCaptureData,
  ImageFrame,
} from '../src';

describe('Vision Capture Pipeline', () => {
  it('Capture returns ImageFrame', async () => {
    const rawBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const timestamp = 1710000000;

    const mockSource: CaptureSource = {
      async capture(): Promise<ImageFrame> {
        return {
          width: 1920,
          height: 1080,
          channels: 4,
          timestamp,
          data: rawBuffer,
        };
      },
    };

    const pipeline = new CapturePipeline(mockSource);
    const frame = await pipeline.capture();

    expect(frame).toBeDefined();
    expect(frame.width).toBe(1920);
    expect(frame.height).toBe(1080);
    expect(frame.channels).toBe(4);
    expect(frame.timestamp).toBe(timestamp);
    expect(frame.data).toBe(rawBuffer);
  });

  it('Width and height are preserved', async () => {
    const mockScreenSource: IScreenCaptureSource = {
      async captureScreen(): Promise<ScreenCaptureData> {
        return {
          width: 3840,
          height: 2160,
          timestamp: Date.now(),
          image: new Uint8Array([10, 20, 30, 40]),
        };
      },
    };

    const adapter = new ScreenCaptureSourceAdapter(mockScreenSource);
    const pipeline = new CapturePipeline(adapter);
    const frame = await pipeline.capture();

    expect(frame.width).toBe(3840);
    expect(frame.height).toBe(2160);
  });

  it('Timestamp is preserved', async () => {
    const expectedTime = 1720000000;
    const mockScreenSource: IScreenCaptureSource = {
      async captureScreen(): Promise<ScreenCaptureData> {
        return {
          width: 1920,
          height: 1080,
          timestamp: expectedTime,
          image: new Uint8Array([0]),
        };
      },
    };

    const adapter = new ScreenCaptureSourceAdapter(mockScreenSource);
    const pipeline = new CapturePipeline(adapter);
    const frame = await pipeline.capture();

    expect(frame.timestamp).toBe(expectedTime);
  });

  it('Image buffer is preserved', async () => {
    const originalBuffer = new Uint8Array([100, 150, 200, 250]);
    const mockScreenSource: IScreenCaptureSource = {
      async captureScreen(): Promise<ScreenCaptureData> {
        return {
          width: 800,
          height: 600,
          timestamp: 1000,
          image: originalBuffer,
        };
      },
    };

    const adapter = new ScreenCaptureSourceAdapter(mockScreenSource);
    const pipeline = new CapturePipeline(adapter);
    const frame = await pipeline.capture();

    // Verify exact reference without buffer duplication
    expect(frame.data).toBe(originalBuffer);
    expect(frame.data[0]).toBe(100);
    expect(frame.data[3]).toBe(250);
  });

  it('Dependency injection works', async () => {
    let captured = false;
    class CustomCaptureSource implements CaptureSource {
      async capture(): Promise<ImageFrame> {
        captured = true;
        return {
          width: 100,
          height: 100,
          channels: 1,
          timestamp: 500,
          data: new Uint8Array([42]),
        };
      }
    }

    const customSource = new CustomCaptureSource();
    const pipeline = new CapturePipeline(customSource);
    const frame = await pipeline.capture();

    expect(captured).toBe(true);
    expect(frame.width).toBe(100);
    expect(frame.data[0]).toBe(42);
  });
});
