import { WindowManager, INativeWindow } from './WindowManager';
import { IpcHandler } from './IpcHandler';
import { WindowStateStore } from './WindowStateStore';

export interface AppLifecycleHost {
  isReady(): boolean;
  whenReady(): Promise<void>;
  quit(): void;
  exit(code?: number): void;
  on(event: string, listener: (...args: any[]) => void): void;
}

export class MockAppLifecycleHost implements AppLifecycleHost {
  private ready: boolean = false;
  private listeners = new Map<string, Array<(...args: any[]) => void>>();

  isReady(): boolean {
    return this.ready;
  }

  async whenReady(): Promise<void> {
    this.ready = true;
    return Promise.resolve();
  }

  quit(): void {
    this.emit('before-quit');
    this.emit('will-quit');
    this.emit('quit');
  }

  exit(_code: number = 0): void {}

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

export interface ApplicationConfig {
  isDev?: boolean;
  preloadPath?: string;
  rendererUrl?: string;
  rendererFilePath?: string;
}

export class Application {
  private isShuttingDown: boolean = false;
  private isStarted: boolean = false;

  constructor(
    private readonly windowManager: WindowManager = new WindowManager(new WindowStateStore()),
    private readonly ipcHandler: IpcHandler = new IpcHandler(),
    private readonly appHost: AppLifecycleHost = new MockAppLifecycleHost(),
    private readonly config: ApplicationConfig = { isDev: false }
  ) {}

  async bootstrap(): Promise<INativeWindow> {
    this.ipcHandler.registerHandlers();
    this.setupLifecycleListeners();

    await this.appHost.whenReady();
    this.isStarted = true;

    const mainWindow = this.windowManager.createMainWindow(this.config.preloadPath);

    if (this.config.rendererUrl) {
      await mainWindow.loadURL(this.config.rendererUrl);
    } else if (this.config.rendererFilePath) {
      await mainWindow.loadFile(this.config.rendererFilePath);
    }

    mainWindow.show();
    return mainWindow;
  }

  private setupLifecycleListeners(): void {
    this.appHost.on('window-all-closed', () => {
      // Standard Windows desktop behavior: quit when all windows close
      this.shutdown();
    });

    this.appHost.on('activate', () => {
      if (this.isStarted && !this.windowManager.getMainWindow()) {
        this.windowManager.createMainWindow(this.config.preloadPath);
      }
    });

    this.appHost.on('before-quit', () => {
      this.isShuttingDown = true;
    });
  }

  shutdown(): void {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    this.windowManager.closeMainWindow();
    this.appHost.quit();
  }

  getWindowManager(): WindowManager {
    return this.windowManager;
  }

  getIpcHandler(): IpcHandler {
    return this.ipcHandler;
  }

  isDevMode(): boolean {
    return Boolean(this.config.isDev);
  }

  isInitialized(): boolean {
    return this.isStarted;
  }
}
