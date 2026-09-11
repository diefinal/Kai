import { describe, it, expect } from 'vitest';
import {
  Win32Provider,
  NativeProvider,
  WindowManager,
  IWindowProvider,
  DisplayManager,
  IDisplayProvider,
} from '../src';

class TestableWin32Provider extends Win32Provider {
  constructor(private readonly mockOutputMap: Record<string, string> = {}) {
    super();
  }

  protected override async executePowerShell(script: string): Promise<string> {
    if (script.includes('[Win32NativeApi]::GetForegroundWindowDto()')) {
      return (
        this.mockOutputMap['GetForegroundWindowDto'] ??
        JSON.stringify({
          id: '1001',
          title: 'Visual Studio Code',
          processId: 1234,
          processName: 'Code',
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          isVisible: true,
          isForeground: true,
        })
      );
    }

    if (script.includes('[Win32NativeApi]::EnumerateWindows()')) {
      return (
        this.mockOutputMap['EnumerateWindows'] ??
        JSON.stringify([
          {
            id: '1001',
            title: 'Visual Studio Code',
            processId: 1234,
            processName: 'Code',
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            isVisible: true,
            isForeground: true,
          },
          {
            id: '1002',
            title: 'Google Chrome',
            processId: 5678,
            processName: 'chrome',
            x: 100,
            y: 100,
            width: 1200,
            height: 800,
            isVisible: true,
            isForeground: false,
          },
          // Should be filtered out: empty title
          {
            id: '1003',
            title: '   ',
            processId: 9999,
            processName: 'background',
            x: 0,
            y: 0,
            width: 500,
            height: 500,
            isVisible: true,
            isForeground: false,
          },
          // Should be filtered out: invisible
          {
            id: '1004',
            title: 'Hidden Window',
            processId: 8888,
            processName: 'hidden',
            x: 0,
            y: 0,
            width: 500,
            height: 500,
            isVisible: false,
            isForeground: false,
          },
          // Should be filtered out: width <= 0
          {
            id: '1005',
            title: 'Zero Size',
            processId: 7777,
            processName: 'zero',
            x: 0,
            y: 0,
            width: 0,
            height: 500,
            isVisible: true,
            isForeground: false,
          },
        ])
      );
    }

    return super.executePowerShell(script);
  }
}

describe('Win32Provider Native Window API', () => {
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

  it('Active window is returned', async () => {
    const provider = new TestableWin32Provider();
    const active = await provider.getActiveWindow();

    expect(active).not.toBeNull();
    expect(active!.id).toBe('1001');
    expect(active!.title).toBe('Visual Studio Code');
    expect(active!.processId).toBe(1234);
    expect(active!.processName).toBe('Code');
    expect(active!.bounds).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
    expect(active!.isVisible).toBe(true);
    expect(active!.isForeground).toBe(true);
  });

  it('Window list is not empty (when windows exist)', async () => {
    const provider = new TestableWin32Provider();
    const windows = await provider.getWindows();

    expect(windows).toBeDefined();
    expect(windows.length).toBeGreaterThan(0);
    expect(windows.length).toBe(2);
  });

  it('Active window exists inside returned list', async () => {
    const provider = new TestableWin32Provider();
    const active = await provider.getActiveWindow();
    const windows = await provider.getWindows();

    expect(active).not.toBeNull();
    const match = windows.find((w) => w.id === active!.id);
    expect(match).toBeDefined();
    expect(match!.title).toBe(active!.title);
  });

  it('Invisible windows are ignored', async () => {
    const provider = new TestableWin32Provider();
    const windows = await provider.getWindows();

    const hidden = windows.find((w) => w.id === '1004' || w.title === 'Hidden Window');
    expect(hidden).toBeUndefined();
    expect(windows.every((w) => w.isVisible)).toBe(true);
  });

  it('Empty titled windows are ignored', async () => {
    const provider = new TestableWin32Provider();
    const windows = await provider.getWindows();

    const empty = windows.find((w) => w.id === '1003');
    expect(empty).toBeUndefined();
    expect(windows.every((w) => w.title.trim().length > 0)).toBe(true);
  });

  it('Unimplemented methods still throw "Not implemented"', async () => {
    const provider = new Win32Provider();

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
