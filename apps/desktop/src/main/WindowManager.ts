import { WindowBounds, WindowStateStore } from './WindowStateStore';

export interface NativeWindowOptions {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  x?: number;
  y?: number;
  frame: boolean;
  titleBarStyle?: 'default' | 'hidden';
  title: string;
  webPreferences: {
    preload?: string;
    nodeIntegration: boolean;
    contextIsolation: boolean;
    sandbox: boolean;
  };
}

export interface INativeWindow {
  id: number;
  isDestroyed(): boolean;
  isVisible(): boolean;
  isMaximized(): boolean;
  getBounds(): { x: number; y: number; width: number; height: number };
  loadURL(url: string): Promise<void>;
  loadFile(filePath: string): Promise<void>;
  show(): void;
  close(): void;
  on(event: string, listener: (...args: any[]) => void): void;
}

export interface WindowFactory {
  createWindow(options: NativeWindowOptions): INativeWindow;
}

export class DefaultNativeWindowMock implements INativeWindow {
  public id: number = 1;
  private destroyed: boolean = false;
  private visible: boolean = false;
  private maximized: boolean = false;
  private bounds: { x: number; y: number; width: number; height: number };
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  constructor(private readonly options: NativeWindowOptions) {
    this.bounds = {
      x: options.x ?? 100,
      y: options.y ?? 100,
      width: options.width,
      height: options.height,
    };
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  isVisible(): boolean {
    return this.visible;
  }

  isMaximized(): boolean {
    return this.maximized;
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return { ...this.bounds };
  }

  async loadURL(_url: string): Promise<void> {
    return Promise.resolve();
  }

  async loadFile(_filePath: string): Promise<void> {
    return Promise.resolve();
  }

  show(): void {
    this.visible = true;
    this.emit('ready-to-show');
    this.emit('show');
  }

  close(): void {
    this.destroyed = true;
    this.visible = false;
    this.emit('closed');
  }

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.listeners.get(event) ?? [];
    for (const handler of handlers) {
      handler(...args);
    }
  }
}

export class MockWindowFactory implements WindowFactory {
  createWindow(options: NativeWindowOptions): INativeWindow {
    return new DefaultNativeWindowMock(options);
  }
}

export class WindowManager {
  private mainWindow: INativeWindow | null = null;

  constructor(
    private readonly windowStateStore: WindowStateStore = new WindowStateStore(),
    private readonly windowFactory: WindowFactory = new MockWindowFactory()
  ) {}

  createMainWindow(preloadPath?: string): INativeWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.show();
      return this.mainWindow;
    }

    const bounds: WindowBounds = this.windowStateStore.getInitialBounds();

    const windowOptions: NativeWindowOptions = {
      width: bounds.width,
      height: bounds.height,
      minWidth: WindowStateStore.MIN_WIDTH,
      minHeight: WindowStateStore.MIN_HEIGHT,
      x: bounds.x,
      y: bounds.y,
      frame: true, // Native Windows title bar
      title: 'Kai Desktop',
      webPreferences: {
        preload: preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    };

    const window = this.windowFactory.createWindow(windowOptions);
    this.mainWindow = window;

    window.on('close', () => {
      if (!window.isDestroyed()) {
        const currentBounds = window.getBounds();
        this.windowStateStore.saveBounds({
          x: currentBounds.x,
          y: currentBounds.y,
          width: currentBounds.width,
          height: currentBounds.height,
          isMaximized: window.isMaximized(),
        });
      }
    });

    window.on('closed', () => {
      this.mainWindow = null;
    });

    return window;
  }

  getMainWindow(): INativeWindow | null {
    if (this.mainWindow && this.mainWindow.isDestroyed()) {
      this.mainWindow = null;
    }
    return this.mainWindow;
  }

  closeMainWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close();
      this.mainWindow = null;
    }
  }
}
