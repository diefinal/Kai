import { describe, it, expect, beforeEach } from 'vitest';
import { ImageCache, ImageFrame } from '../src';

describe('ImageCache', () => {
  let cache: ImageCache;
  let sampleFrame: ImageFrame;

  beforeEach(() => {
    cache = new ImageCache();
    sampleFrame = {
      width: 1920,
      height: 1080,
      channels: 4,
      timestamp: Date.now(),
      data: new Uint8Array([1, 2, 3, 4]),
    };
  });

  it('store()', () => {
    const id = cache.store(sampleFrame);

    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(cache.size()).toBe(1);
  });

  it('get()', () => {
    const id = cache.store(sampleFrame);
    const retrieved = cache.get(id);

    expect(retrieved).toBeDefined();
    // Verifies exact reference without buffer copying
    expect(retrieved).toBe(sampleFrame);
    expect(retrieved!.width).toBe(1920);
    expect(retrieved!.height).toBe(1080);
    expect(retrieved!.data).toBe(sampleFrame.data);
  });

  it('unknown id returns null', () => {
    const result = cache.get('non-existent-id');
    expect(result).toBeNull();
  });

  it('remove()', () => {
    const id = cache.store(sampleFrame);
    expect(cache.size()).toBe(1);

    const removed = cache.remove(id);
    expect(removed).toBe(true);
    expect(cache.size()).toBe(0);
    expect(cache.get(id)).toBeNull();

    const removedAgain = cache.remove(id);
    expect(removedAgain).toBe(false);
  });

  it('clear()', () => {
    const frame2: ImageFrame = {
      width: 800,
      height: 600,
      channels: 3,
      timestamp: Date.now(),
      data: new Uint8Array([5, 6, 7]),
    };

    cache.store(sampleFrame);
    cache.store(frame2);
    expect(cache.size()).toBe(2);

    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('size()', () => {
    expect(cache.size()).toBe(0);

    const id1 = cache.store(sampleFrame);
    expect(cache.size()).toBe(1);

    const frame2: ImageFrame = {
      width: 640,
      height: 480,
      channels: 4,
      timestamp: Date.now(),
      data: new Uint8Array([10, 20]),
    };
    const id2 = cache.store(frame2);
    expect(cache.size()).toBe(2);

    cache.remove(id1);
    expect(cache.size()).toBe(1);

    cache.remove(id2);
    expect(cache.size()).toBe(0);
  });
});
