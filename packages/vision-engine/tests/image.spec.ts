import { describe, it, expect } from 'vitest';
import { ImageFrame, ImageMetadata } from '../src';

describe('Image Model Foundation', () => {
  it('ImageFrame creation', () => {
    const rawData = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
    const timestamp = Date.now();
    const frame: ImageFrame = {
      width: 1920,
      height: 1080,
      channels: 4,
      timestamp,
      data: rawData,
    };

    expect(frame).toBeDefined();
    expect(frame.width).toBe(1920);
    expect(frame.height).toBe(1080);
    expect(frame.channels).toBe(4);
    expect(frame.timestamp).toBe(timestamp);
    expect(frame.data).toBe(rawData);
    expect(frame.data.length).toBe(8);
  });

  it('metadata values', () => {
    const metadata: ImageMetadata = {
      width: 2560,
      height: 1440,
      dpi: 144,
      format: 'rgba',
    };

    expect(metadata).toBeDefined();
    expect(metadata.width).toBe(2560);
    expect(metadata.height).toBe(1440);
    expect(metadata.dpi).toBe(144);
    expect(metadata.format).toBe('rgba');
  });

  it('exports', async () => {
    const visionEngine = await import('../src');

    // Verify interfaces/types are re-exported and package compiles properly
    expect(visionEngine).toBeDefined();
    expect(visionEngine.VisionManager).toBeDefined();
    expect(visionEngine.VisionPipeline).toBeDefined();
  });
});
