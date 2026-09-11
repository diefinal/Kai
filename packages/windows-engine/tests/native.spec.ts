import { describe, it, expect } from 'vitest';
import {
  Win32Provider,
  NativeProvider,
  WindowManager,
  IWindowProvider,
  DisplayManager,
  IDisplayProvider,
} from '../src';

describe('Win32Provider', () => {
  it('Win32Provider implements NativeProvider', () => {
    const provider: NativeProvider = new Win32Provider();
    expect(provider).toBeDefined();
    expect(typeof provider.getWindows).toBe('function');
    expect(typeof provider.getActiveWindow).toBe('function');
    expect(typeof provider.getMousePosition).toBe('function');
    expect(typeof provider.captureScreen).toBe('function');
    expect(typeof provider.readClipboard).toBe('function');
    expect(typeof provider.writeClipboard).toBe('function');
  });

  it('Every method currently throws "Not implemented"', async () => {
    const provider = new Win32Provider();

    await expect(provider.getWindows()).rejects.toThrow('Not implemented');
    await expect(provider.getActiveWindow()).rejects.toThrow('Not implemented');
    await expect(provider.getMousePosition()).rejects.toThrow('Not implemented');
    await expect(provider.captureScreen()).rejects.toThrow('Not implemented');
    await expect(provider.readClipboard()).rejects.toThrow('Not implemented');
    await expect(provider.writeClipboard('test')).rejects.toThrow('Not implemented');
  });

  it('Existing managers still compile with dependency injection', () => {
    const mockWindowProvider: IWindowProvider = {
      enumerate: async () => [],
      getActiveWindow: async () => null,
    };
    const windowManager = new WindowManager(mockWindowProvider);
    expect(windowManager).toBeDefined();

    const mockDisplayProvider: IDisplayProvider = {
      enumerate: async () => [],
    };
    const displayManager = new DisplayManager(mockDisplayProvider);
    expect(displayManager).toBeDefined();
  });
});
