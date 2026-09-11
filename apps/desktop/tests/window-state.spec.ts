import { describe, it, expect } from 'vitest';
import { WindowStateStore, InMemoryWindowStateStorage } from '../src/main/WindowStateStore';

describe('WindowStateStore', () => {
  it('returns default dimensions 1200x800 when storage is empty', () => {
    const storage = new InMemoryWindowStateStorage();
    const store = new WindowStateStore(storage);

    const bounds = store.getInitialBounds();
    expect(bounds.width).toBe(1200);
    expect(bounds.height).toBe(800);
    expect(bounds.isMaximized).toBe(false);
    expect(bounds.x).toBeUndefined();
    expect(bounds.y).toBeUndefined();
  });

  it('enforces minimum window dimensions 900x600', () => {
    const storage = new InMemoryWindowStateStorage();
    storage.setItem('kai:window-state', JSON.stringify({
      x: 150,
      y: 150,
      width: 500,
      height: 400,
      isMaximized: false,
    }));

    const store = new WindowStateStore(storage);
    const bounds = store.getInitialBounds();

    expect(bounds.width).toBe(900);
    expect(bounds.height).toBe(600);
    expect(bounds.x).toBe(150);
    expect(bounds.y).toBe(150);
  });

  it('saves and restores window state correctly', () => {
    const storage = new InMemoryWindowStateStorage();
    const store = new WindowStateStore(storage);

    store.saveBounds({
      x: 200,
      y: 300,
      width: 1400,
      height: 900,
      isMaximized: true,
    });

    const restored = store.getInitialBounds();
    expect(restored.x).toBe(200);
    expect(restored.y).toBe(300);
    expect(restored.width).toBe(1400);
    expect(restored.height).toBe(900);
    expect(restored.isMaximized).toBe(true);
  });

  it('handles invalid JSON gracefully', () => {
    const storage = new InMemoryWindowStateStorage();
    storage.setItem('kai:window-state', 'invalid json string');

    const store = new WindowStateStore(storage);
    const bounds = store.getInitialBounds();

    expect(bounds.width).toBe(1200);
    expect(bounds.height).toBe(800);
  });
});