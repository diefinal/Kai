import { describe, it, expect } from 'vitest';
import {
  CaptureProvider,
  ScreenCapture,
  ScreenCaptureManager,
} from '../src';

class MockCaptureProvider implements CaptureProvider {
  constructor(
    private readonly mockCapture: ScreenCapture = {
      width: 1920,
      height: 1080,
      timestamp: Date.now(),
      image: new Uint8Array([1, 2, 3, 4]),
    }
  ) {}

  async captureScreen(): Promise<ScreenCapture> {
    return this.mockCapture;
  }
}

describe('ScreenCaptureManager', () => {
  it('captureScreen returns image', async () => {
    const manager = new ScreenCaptureManager(new MockCaptureProvider());
    const capture = await manager.captureScreen();

    expect(capture).toBeDefined();
    expect(capture.image).toBeInstanceOf(Uint8Array);
    expect(capture.image.length).toBeGreaterThan(0);
  });

  it('width > 0', async () => {
    const manager = new ScreenCaptureManager(new MockCaptureProvider());
    const capture = await manager.captureScreen();

    expect(capture.width).toBeGreaterThan(0);
  });

  it('height > 0', async () => {
    const manager = new ScreenCaptureManager(new MockCaptureProvider());
    const capture = await manager.captureScreen();

    expect(capture.height).toBeGreaterThan(0);
  });

  it('timestamp exists', async () => {
    const manager = new ScreenCaptureManager(new MockCaptureProvider());
    const capture = await manager.captureScreen();

    expect(capture.timestamp).toBeDefined();
    expect(typeof capture.timestamp).toBe('number');
    expect(capture.timestamp).toBeGreaterThan(0);
  });

  it('provider abstraction works', async () => {
    const customData: ScreenCapture = {
      width: 2560,
      height: 1440,
      timestamp: 1234567890,
      image: new Uint8Array([10, 20, 30]),
    };
    const customProvider = new MockCaptureProvider(customData);
    const manager = new ScreenCaptureManager(customProvider);

    const result = await manager.captureScreen();

    expect(result).toEqual(customData);
    expect(result.width).toBe(2560);
    expect(result.height).toBe(1440);
  });
});
