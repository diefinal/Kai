export interface KaiDesktopApi {
  version: () => Promise<{ version: string; name: string }>;
  ping: () => Promise<string>;
  executeCommand: (command: string) => Promise<string>;
  window: {
    minimize: () => Promise<{ action: string }>;
    maximize: () => Promise<{ action: string }>;
    close: () => Promise<{ action: string }>;
  };
}

export interface ContextBridgeApi {
  exposeInMainWorld(apiKey: string, api: any): void;
}

export interface IpcRendererClient {
  invoke(channel: string, ...args: any[]): Promise<any>;
  on(channel: string, listener: (...args: any[]) => void): void;
  removeListener(channel: string, listener: (...args: any[]) => void): void;
}

export class MockIpcRendererClient implements IpcRendererClient {
  constructor(private readonly invokeHandler?: (channel: string, ...args: any[]) => Promise<any>) {}

  async invoke(channel: string, ...args: any[]): Promise<any> {
    if (this.invokeHandler) {
      return this.invokeHandler(channel, ...args);
    }
    if (channel === 'kai:app:version') {
      return { version: '0.0.1', name: 'Kai Desktop' };
    }
    if (channel === 'kai:app:ping') {
      return 'pong';
    }
    if (channel === 'kai:command:execute') {
      return 'Command executed';
    }
    if (channel.startsWith('kai:window:')) {
      const action = channel.replace('kai:window:', '');
      return { action };
    }
    return undefined;
  }

  on(_channel: string, _listener: (...args: any[]) => void): void {}
  removeListener(_channel: string, _listener: (...args: any[]) => void): void {}
}

export class MockContextBridge implements ContextBridgeApi {
  private exposed = new Map<string, any>();

  exposeInMainWorld(apiKey: string, api: any): void {
    this.exposed.set(apiKey, api);
  }

  getExposed(apiKey: string): any {
    return this.exposed.get(apiKey);
  }
}

export class PreloadBridge {
  constructor(
    private readonly contextBridge: ContextBridgeApi = new MockContextBridge(),
    private readonly ipcRenderer: IpcRendererClient = new MockIpcRendererClient()
  ) {}

  buildApi(): KaiDesktopApi {
    return {
      version: () => this.ipcRenderer.invoke('kai:app:version'),
      ping: () => this.ipcRenderer.invoke('kai:app:ping'),
      executeCommand: (command: string) => this.ipcRenderer.invoke('kai:command:execute', command),
      window: {
        minimize: () => this.ipcRenderer.invoke('kai:window:minimize'),
        maximize: () => this.ipcRenderer.invoke('kai:window:maximize'),
        close: () => this.ipcRenderer.invoke('kai:window:close'),
      },
    };
  }

  expose(): void {
    const api = this.buildApi();
    this.contextBridge.exposeInMainWorld('kai', api);
  }
}