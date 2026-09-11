export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
}

export interface WindowStateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class InMemoryWindowStateStorage implements WindowStateStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

export class WindowStateStore {
  public static readonly DEFAULT_WIDTH = 1200;
  public static readonly DEFAULT_HEIGHT = 800;
  public static readonly MIN_WIDTH = 900;
  public static readonly MIN_HEIGHT = 600;
  private static readonly STORAGE_KEY = 'kai:window-state';

  constructor(private readonly storage: WindowStateStorage = new InMemoryWindowStateStorage()) {}

  getInitialBounds(): WindowBounds {
    const raw = this.storage.getItem(WindowStateStore.STORAGE_KEY);
    if (!raw) {
      return {
        width: WindowStateStore.DEFAULT_WIDTH,
        height: WindowStateStore.DEFAULT_HEIGHT,
        isMaximized: false,
      };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<WindowBounds>;
      return {
        x: typeof parsed.x === 'number' ? parsed.x : undefined,
        y: typeof parsed.y === 'number' ? parsed.y : undefined,
        width: Math.max(parsed.width ?? WindowStateStore.DEFAULT_WIDTH, WindowStateStore.MIN_WIDTH),
        height: Math.max(parsed.height ?? WindowStateStore.DEFAULT_HEIGHT, WindowStateStore.MIN_HEIGHT),
        isMaximized: Boolean(parsed.isMaximized),
      };
    } catch {
      return {
        width: WindowStateStore.DEFAULT_WIDTH,
        height: WindowStateStore.DEFAULT_HEIGHT,
        isMaximized: false,
      };
    }
  }

  saveBounds(bounds: WindowBounds): void {
    const state: WindowBounds = {
      x: bounds.x,
      y: bounds.y,
      width: Math.max(bounds.width, WindowStateStore.MIN_WIDTH),
      height: Math.max(bounds.height, WindowStateStore.MIN_HEIGHT),
      isMaximized: Boolean(bounds.isMaximized),
    };
    this.storage.setItem(WindowStateStore.STORAGE_KEY, JSON.stringify(state));
  }
}
