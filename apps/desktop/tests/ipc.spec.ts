import { describe, it, expect } from 'vitest';
import { IpcHandler, InMemoryIpcBridgeServer } from '../src/main/IpcHandler';
import { PreloadBridge, MockContextBridge, MockIpcRendererClient } from '../src/preload/PreloadBridge';

describe('IPC and Preload Bridge', () => {
  it('registers standard desktop IPC handlers', async () => {
    const server = new InMemoryIpcBridgeServer();
    const handler = new IpcHandler(server);

    handler.registerHandlers();

    expect(server.hasHandler('kai:app:version')).toBe(true);
    expect(server.hasHandler('kai:app:ping')).toBe(true);
    expect(server.hasHandler('kai:window:minimize')).toBe(true);
    expect(server.hasHandler('kai:window:maximize')).toBe(true);
    expect(server.hasHandler('kai:window:close')).toBe(true);

    const versionRes = await server.invoke('kai:app:version');
    expect(versionRes).toEqual({ version: '0.0.1', name: 'Kai Desktop' });

    const pingRes = await server.invoke('kai:app:ping');
    expect(pingRes).toBe('pong');

    const minRes = await server.invoke('kai:window:minimize');
    expect(minRes).toEqual({ action: 'minimize' });
  });

  it('exposes API safely through PreloadBridge', async () => {
    const contextBridge = new MockContextBridge();
    const ipcRenderer = new MockIpcRendererClient();
    const preload = new PreloadBridge(contextBridge, ipcRenderer);

    preload.expose();

    const exposed = contextBridge.getExposed('kai');
    expect(exposed).toBeDefined();
    expect(typeof exposed.version).toBe('function');
    expect(typeof exposed.ping).toBe('function');
    expect(typeof exposed.window.minimize).toBe('function');
    expect(typeof exposed.window.maximize).toBe('function');
    expect(typeof exposed.window.close).toBe('function');

    const version = await exposed.version();
    expect(version).toEqual({ version: '0.0.1', name: 'Kai Desktop' });

    const pong = await exposed.ping();
    expect(pong).toBe('pong');
  });
});