import { spawn } from 'child_process';
import { IWindowProvider } from '../native/WindowProvider';

export interface LaunchAppResult {
  success: boolean;
  alreadyOpen?: boolean;
  appName: string;
  processName?: string;
  error?: string;
}

export interface AppDefinition {
  name: string;
  command: string;
  processName: string;
  aliases: string[];
}

export const KNOWN_APPLICATIONS: Record<string, AppDefinition> = {
  chrome: {
    name: 'Google Chrome',
    command: 'chrome',
    processName: 'chrome',
    aliases: ['chrome', 'google chrome', 'browser'],
  },
  edge: {
    name: 'Microsoft Edge',
    command: 'msedge',
    processName: 'msedge',
    aliases: ['edge', 'msedge', 'microsoft edge'],
  },
  vscode: {
    name: 'Visual Studio Code',
    command: 'code',
    processName: 'Code',
    aliases: ['vscode', 'vs code', 'visual studio code', 'code'],
  },
  notepad: {
    name: 'Notepad',
    command: 'notepad',
    processName: 'notepad',
    aliases: ['notepad', 'not defteri'],
  },
  explorer: {
    name: 'File Explorer',
    command: 'explorer',
    processName: 'explorer',
    aliases: ['explorer', 'file explorer', 'dosya gezgini'],
  },
};

export class AppLauncher {
  constructor(private readonly windowProvider?: IWindowProvider) {}

  resolveApp(target: string): AppDefinition | undefined {
    const norm = target.toLowerCase().trim();
    if (KNOWN_APPLICATIONS[norm]) {
      return KNOWN_APPLICATIONS[norm];
    }
    for (const app of Object.values(KNOWN_APPLICATIONS)) {
      if (app.aliases.some((a) => norm.includes(a) || a.includes(norm))) {
        return app;
      }
    }
    return undefined;
  }

  async launch(target: string): Promise<LaunchAppResult> {
    const app = this.resolveApp(target);
    if (!app) {
      return {
        success: false,
        appName: target,
        error: `Application "${target}" is not recognized or supported.`,
      };
    }

    if (this.windowProvider) {
      try {
        const windows = await this.windowProvider.enumerate();
        const existing = windows.find(
          (w) =>
            (w.processName && w.processName.toLowerCase().includes(app.processName.toLowerCase())) ||
            (w.title && w.title.toLowerCase().includes(app.name.toLowerCase()))
        );

        if (existing) {
          if (this.windowProvider.activateWindow) {
            await this.windowProvider.activateWindow(existing.id);
          }
          return {
            success: true,
            alreadyOpen: true,
            appName: app.name,
            processName: app.processName,
          };
        }
      } catch {
        // Fallback to spawning
      }
    }

    try {
      await this.spawnProcess(app.command);
      return {
        success: true,
        alreadyOpen: false,
        appName: app.name,
        processName: app.processName,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        appName: app.name,
        error: msg || `Failed to start ${app.name}`,
      };
    }
  }

  protected async spawnProcess(cmd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Start-Process "${cmd}"`,
      ]);

      ps.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed with exit code ${code}`));
        }
      });

      ps.on('error', (err) => {
        reject(err);
      });
    });
  }
}
