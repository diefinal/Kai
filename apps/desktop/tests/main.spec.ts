import { describe, it, expect } from 'vitest';
import { Application, MockAppLifecycleHost } from '../src/main/Application';
import { WindowManager, MockWindowFactory } from '../src/main/WindowManager';
import { WindowStateStore, InMemoryWindowStateStorage } from '../src/main/WindowStateStore';
import { IpcHandler, InMemoryIpcBridgeServer } from '../src/main/IpcHandler';
import { RendererApp } from '../src/renderer/RendererApp';

describe('Application and Window Lifecycle', () => {
  it('bootstraps application, creates single main window with 1200x800 size and native title bar', async () => {
    const storage = new InMemoryWindowStateStorage();
    const windowStateStore = new WindowStateStore(storage);
    const windowFactory = new MockWindowFactory();
    const windowManager = new WindowManager(windowStateStore, windowFactory);
    const ipcHandler = new IpcHandler(new InMemoryIpcBridgeServer());
    const appHost = new MockAppLifecycleHost();

    const app = new Application(windowManager, ipcHandler, appHost, {
      isDev: false,
      preloadPath: '/mock/path/preload.js',
      rendererFilePath: '/mock/path/index.html',
    });

    const window = await app.bootstrap();

    expect(window).toBeDefined();
    expect(window.isVisible()).toBe(true);
    expect(app.isInitialized()).toBe(true);
    expect(app.isDevMode()).toBe(false);

    const bounds = window.getBounds();
    expect(bounds.width).toBe(1200);
    expect(bounds.height).toBe(800);
  });

  it('guarantees single window instance on repeated creation', async () => {
    const storage = new InMemoryWindowStateStorage();
    const windowStateStore = new WindowStateStore(storage);
    const windowFactory = new MockWindowFactory();
    const windowManager = new WindowManager(windowStateStore, windowFactory);

    const win1 = windowManager.createMainWindow();
    const win2 = windowManager.createMainWindow();

    expect(win1).toBe(win2);
  });

  it('performs graceful shutdown when window is closed', async () => {
    const storage = new InMemoryWindowStateStorage();
    const windowStateStore = new WindowStateStore(storage);
    const windowFactory = new MockWindowFactory();
    const windowManager = new WindowManager(windowStateStore, windowFactory);
    const ipcHandler = new IpcHandler(new InMemoryIpcBridgeServer());
    const appHost = new MockAppLifecycleHost();

    const app = new Application(windowManager, ipcHandler, appHost);
    const window = await app.bootstrap();

    expect(windowManager.getMainWindow()).toBeDefined();

    app.shutdown();

    expect(window.isDestroyed()).toBe(true);
    expect(windowManager.getMainWindow()).toBeNull();
  });

  it('renders Kai Desktop title and initial state in Renderer', () => {
    const renderer = new RendererApp();
    const elements = renderer.getElements();

    expect(elements.title).toBe('Kai Desktop');
    expect(elements.status).toBe('Loading...');

    const fakeDom = { innerHTML: '' };
    renderer.mount(fakeDom);
    expect(fakeDom.innerHTML).toContain('kai-chat-window');
  });
});