export type IpcListener = (event: any, ...args: any[]) => Promise<any> | any;

export interface IpcBridgeServer {
  handle(channel: string, listener: IpcListener): void;
  on(channel: string, listener: IpcListener): void;
  removeHandler(channel: string): void;
  removeAllListeners(channel: string): void;
}

export class InMemoryIpcBridgeServer implements IpcBridgeServer {
  private handlers = new Map<string, IpcListener>();
  private listeners = new Map<string, IpcListener[]>();

  handle(channel: string, listener: IpcListener): void {
    this.handlers.set(channel, listener);
  }

  on(channel: string, listener: IpcListener): void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
    }
    this.listeners.get(channel)?.push(listener);
  }

  removeHandler(channel: string): void {
    this.handlers.delete(channel);
  }

  removeAllListeners(channel: string): void {
    this.listeners.delete(channel);
  }

  async invoke(channel: string, ...args: any[]): Promise<any> {
    const handler = this.handlers.get(channel);
    if (!handler) {
      throw new Error('No handler registered for channel: ' + channel);
    }
    return handler({ channel }, ...args);
  }

  send(channel: string, ...args: any[]): void {
    const handlers = this.listeners.get(channel) ?? [];
    for (const h of handlers) {
      h({ channel }, ...args);
    }
  }

  hasHandler(channel: string): boolean {
    return this.handlers.has(channel);
  }
}

export class IpcHandler {
  constructor(private readonly ipcServer: IpcBridgeServer = new InMemoryIpcBridgeServer()) {}

  registerHandlers(): void {
    this.ipcServer.handle('kai:app:version', async () => {
      return { version: '0.0.1', name: 'Kai Desktop' };
    });

    this.ipcServer.handle('kai:app:ping', async () => {
      return 'pong';
    });

    this.ipcServer.handle('kai:window:minimize', async () => {
      return { action: 'minimize' };
    });

    this.ipcServer.handle('kai:window:maximize', async () => {
      return { action: 'maximize' };
    });

    this.ipcServer.handle('kai:window:close', async () => {
      return { action: 'close' };
    });
  }

  getIpcServer(): IpcBridgeServer {
    return this.ipcServer;
  }
}