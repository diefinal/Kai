import { app, BrowserWindow, ipcMain } from 'electron';
import { resolve } from 'path';
import { Application } from './Application';
import { WindowManager, ElectronWindowFactory } from './WindowManager';
import { IpcHandler, ElectronIpcBridgeServer } from './IpcHandler';
import { WindowStateStore } from './WindowStateStore';

export * from './WindowStateStore';
export * from './WindowManager';
export * from './IpcHandler';
export * from './Application';

// If executed by Electron main runtime:
if (typeof process !== 'undefined' && process.versions && process.versions.electron && app) {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const preloadPath = resolve(__dirname, '../preload/index.js');
  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  const rendererFilePath = resolve(__dirname, '../renderer/index.html');

  const windowManager = new WindowManager(
    new WindowStateStore(),
    new ElectronWindowFactory(BrowserWindow)
  );
  const ipcHandler = new IpcHandler(new ElectronIpcBridgeServer(ipcMain));

  const application = new Application(windowManager, ipcHandler, app, {
    isDev,
    preloadPath,
    rendererUrl,
    rendererFilePath,
  });

  application.bootstrap().catch((err) => {
    console.error('Failed to bootstrap Kai Desktop:', err);
  });
}

