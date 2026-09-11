import { contextBridge, ipcRenderer } from 'electron';
import { PreloadBridge } from './PreloadBridge';

export * from './PreloadBridge';

// When running inside Electron preload environment:
if (typeof process !== 'undefined' && process.type === 'renderer' && contextBridge && ipcRenderer) {
  try {
    const bridge = new PreloadBridge(contextBridge, ipcRenderer);
    bridge.expose();
  } catch (error) {
    console.error('Failed to expose kai preload bridge:', error);
  }
}
