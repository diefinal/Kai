import { describe, it, expect, beforeEach } from 'vitest';
import { Window, WindowManager, WindowInfo, IWindowProvider } from '../src';

const MOCK_WINDOWS: WindowInfo[] = [
  {
    id: 'hwnd-100',
    title: 'main.ts - Kai - Visual Studio Code',
    processId: 1234,
    processName: 'Code.exe',
    bounds: { x: 0, y: 0, width: 1920, height: 1040 },
    isVisible: true,
    isMinimized: false,
    isForeground: true,
    displayId: 'display-1',
  },
  {
    id: 'hwnd-200',
    title: 'Windows Explorer',
    processId: 5678,
    processName: 'explorer.exe',
    bounds: { x: 100, y: 100, width: 800, height: 600 },
    isVisible: true,
    isMinimized: false,
    isForeground: false,
    displayId: 'display-1',
  },
  {
    id: 'hwnd-300',
    title: 'Settings',
    processId: 9012,
    processName: 'SystemSettings.exe',
    bounds: { x: 200, y: 200, width: 600, height: 400 },
    isVisible: false,
    isMinimized: true,
    isForeground: false,
    displayId: 'display-2',
  },
  {
    id: 'hwnd-400',
    title: 'Terminal',
    processId: 1235,
    processName: 'Code.exe',
    bounds: { x: 0, y: 1040, width: 1920, height: 400 },
    isVisible: true,
    isMinimized: false,
    isForeground: false,
    displayId: 'display-1',
  },
];

class MockWindowProvider implements IWindowProvider {
  constructor(private windows: WindowInfo[] = MOCK_WINDOWS) {}

  async enumerate(): Promise<WindowInfo[]> {
    return this.windows;
  }
}

describe('Window Model', () => {
  it('Creates an immutable Window from WindowInfo', () => {
    const win = new Window(MOCK_WINDOWS[0]);

    expect(win.id).toBe('hwnd-100');
    expect(win.title).toBe('main.ts - Kai - Visual Studio Code');
    expect(win.processId).toBe(1234);
    expect(win.processName).toBe('Code.exe');
    expect(win.isVisible).toBe(true);
    expect(win.isMinimized).toBe(false);
    expect(win.isForeground).toBe(true);
    expect(win.displayId).toBe('display-1');
    expect(win.bounds).toEqual({ x: 0, y: 0, width: 1920, height: 1040 });
  });

  it('Bounds are frozen', () => {
    const win = new Window(MOCK_WINDOWS[0]);

    expect(Object.isFrozen(win.bounds)).toBe(true);
  });
});

describe('WindowManager', () => {
  let manager: WindowManager;

  beforeEach(() => {
    manager = new WindowManager(new MockWindowProvider());
  });

  it('Is not initialized before first query', () => {
    expect(manager.isInitialized()).toBe(false);
  });

  it('Auto-initializes on getWindows', async () => {
    const windows = await manager.getWindows();

    expect(manager.isInitialized()).toBe(true);
    expect(windows).toHaveLength(4);
  });

  it('Returns the foreground window', async () => {
    const fg = await manager.getForegroundWindow();

    expect(fg).toBeDefined();
    expect(fg!.id).toBe('hwnd-100');
    expect(fg!.isForeground).toBe(true);
  });

  it('Returns undefined when no foreground window', async () => {
    const noFg = MOCK_WINDOWS.map((w) => ({ ...w, isForeground: false }));
    const mgr = new WindowManager(new MockWindowProvider(noFg));

    const fg = await mgr.getForegroundWindow();

    expect(fg).toBeUndefined();
  });

  it('Finds window by id', async () => {
    const win = await manager.findWindowById('hwnd-200');

    expect(win).toBeDefined();
    expect(win!.title).toBe('Windows Explorer');
  });

  it('Returns undefined for unknown id', async () => {
    const win = await manager.findWindowById('nonexistent');

    expect(win).toBeUndefined();
  });

  it('Finds windows by process name', async () => {
    const codeWindows = await manager.findWindowsByProcess('Code.exe');

    expect(codeWindows).toHaveLength(2);
    expect(codeWindows[0].processName).toBe('Code.exe');
    expect(codeWindows[1].processName).toBe('Code.exe');
  });

  it('Returns empty array for unknown process', async () => {
    const result = await manager.findWindowsByProcess('Nonexistent.exe');

    expect(result).toHaveLength(0);
  });

  it('Returns only visible windows', async () => {
    const visible = await manager.getVisibleWindows();

    expect(visible).toHaveLength(3);
    expect(visible.every((w) => w.isVisible)).toBe(true);
  });

  it('Handles empty window list', async () => {
    const mgr = new WindowManager(new MockWindowProvider([]));

    const windows = await mgr.getWindows();

    expect(windows).toHaveLength(0);
    expect(await mgr.getForegroundWindow()).toBeUndefined();
    expect(await mgr.getVisibleWindows()).toHaveLength(0);
  });

  it('Refresh re-enumerates windows', async () => {
    await manager.getWindows();
    expect((await manager.getWindows()).length).toBe(4);

    const singleManager = new WindowManager(
      new MockWindowProvider([MOCK_WINDOWS[0]])
    );
    await singleManager.refresh();

    expect((await singleManager.getWindows()).length).toBe(1);
  });
});
