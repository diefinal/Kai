import { describe, it, expect, beforeEach } from 'vitest';
import { Display, DisplayManager, DisplayInfo, IDisplayProvider } from '../src';

const MOCK_DISPLAYS: DisplayInfo[] = [
  {
    id: 'display-1',
    name: 'Primary Monitor',
    primary: true,
    width: 2560,
    height: 1440,
    dpi: 109,
    scaleFactor: 1.25,
    refreshRate: 165,
    bounds: { x: 0, y: 0, width: 2560, height: 1440 },
  },
  {
    id: 'display-2',
    name: 'Secondary Monitor',
    primary: false,
    width: 1920,
    height: 1080,
    dpi: 96,
    scaleFactor: 1.0,
    refreshRate: 60,
    bounds: { x: 2560, y: 0, width: 1920, height: 1080 },
  },
];

class MockDisplayProvider implements IDisplayProvider {
  private displays: DisplayInfo[];

  constructor(displays: DisplayInfo[] = MOCK_DISPLAYS) {
    this.displays = displays;
  }

  async enumerate(): Promise<DisplayInfo[]> {
    return this.displays;
  }
}

describe('Display Model', () => {
  it('Creates an immutable Display from DisplayInfo', () => {
    const display = new Display(MOCK_DISPLAYS[0]);

    expect(display.id).toBe('display-1');
    expect(display.name).toBe('Primary Monitor');
    expect(display.primary).toBe(true);
    expect(display.width).toBe(2560);
    expect(display.height).toBe(1440);
    expect(display.dpi).toBe(109);
    expect(display.scaleFactor).toBe(1.25);
    expect(display.refreshRate).toBe(165);
    expect(display.bounds).toEqual({ x: 0, y: 0, width: 2560, height: 1440 });
  });

  it('Bounds are frozen', () => {
    const display = new Display(MOCK_DISPLAYS[0]);

    expect(Object.isFrozen(display.bounds)).toBe(true);
  });
});

describe('DisplayManager', () => {
  let manager: DisplayManager;

  beforeEach(() => {
    manager = new DisplayManager(new MockDisplayProvider());
  });

  it('Is not initialized before first query', () => {
    expect(manager.isInitialized()).toBe(false);
  });

  it('Auto-initializes on getAll', async () => {
    const displays = await manager.getAll();

    expect(manager.isInitialized()).toBe(true);
    expect(displays).toHaveLength(2);
  });

  it('Returns all displays with correct data', async () => {
    const displays = await manager.getAll();

    expect(displays[0].id).toBe('display-1');
    expect(displays[0].primary).toBe(true);
    expect(displays[1].id).toBe('display-2');
    expect(displays[1].primary).toBe(false);
  });

  it('Returns the primary display', async () => {
    const primary = await manager.getPrimary();

    expect(primary).toBeDefined();
    expect(primary!.id).toBe('display-1');
    expect(primary!.primary).toBe(true);
  });

  it('Returns undefined when no primary exists', async () => {
    const noPrimary: DisplayInfo[] = [
      { ...MOCK_DISPLAYS[0], primary: false },
    ];
    const mgr = new DisplayManager(new MockDisplayProvider(noPrimary));

    const primary = await mgr.getPrimary();

    expect(primary).toBeUndefined();
  });

  it('Finds display by id', async () => {
    const display = await manager.getById('display-2');

    expect(display).toBeDefined();
    expect(display!.name).toBe('Secondary Monitor');
  });

  it('Returns undefined for unknown id', async () => {
    const display = await manager.getById('nonexistent');

    expect(display).toBeUndefined();
  });

  it('Returns correct count', async () => {
    const count = await manager.count();

    expect(count).toBe(2);
  });

  it('Refresh re-enumerates displays', async () => {
    await manager.getAll();
    expect(await manager.count()).toBe(2);

    // Swap provider to one with a single display
    const singleManager = new DisplayManager(
      new MockDisplayProvider([MOCK_DISPLAYS[0]])
    );
    await singleManager.refresh();

    expect(await singleManager.count()).toBe(1);
  });

  it('Handles empty display list', async () => {
    const mgr = new DisplayManager(new MockDisplayProvider([]));

    const displays = await mgr.getAll();

    expect(displays).toHaveLength(0);
    expect(await mgr.getPrimary()).toBeUndefined();
    expect(await mgr.count()).toBe(0);
  });
});
