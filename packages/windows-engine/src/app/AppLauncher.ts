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
    aliases: ['chrome', 'google chrome', 'browser', 'tarayıcı', 'tarayici'],
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
    aliases: ['notepad', 'not defteri', 'notdefteri'],
  },
  calc: {
    name: 'Calculator',
    command: 'calc',
    processName: 'CalculatorApp',
    aliases: ['calc', 'calculator', 'hesap makinesi', 'hesapmakinesi'],
  },
  explorer: {
    name: 'File Explorer',
    command: 'explorer',
    processName: 'explorer',
    aliases: ['explorer', 'file explorer', 'dosya gezgini', 'dosyagezgini'],
  },
  powershell: {
    name: 'PowerShell',
    command: 'powershell',
    processName: 'powershell',
    aliases: ['powershell', 'power shell', 'pwsh'],
  },
  cmd: {
    name: 'Command Prompt',
    command: 'cmd',
    processName: 'cmd',
    aliases: ['cmd', 'command prompt', 'komut istemi', 'komutistemi'],
  },
  wt: {
    name: 'Windows Terminal',
    command: 'wt',
    processName: 'WindowsTerminal',
    aliases: ['terminal', 'windows terminal', 'wt'],
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

    // 1. Check if application window is already running
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

    // 2. Launch application process with verification and single retry
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await this.spawnProcess(app.command);

        // Verification step: verify process/window exists if windowProvider available
        if (this.windowProvider) {
          // Allow short settle time
          await new Promise((r) => setTimeout(r, 300));
          const windows = await this.windowProvider.enumerate();
          const running = windows.some(
            (w) =>
              (w.processName && w.processName.toLowerCase().includes(app.processName.toLowerCase())) ||
              (w.title && w.title.toLowerCase().includes(app.name.toLowerCase()))
          );

          if (!running && attempt < 2) {
            continue;
          }
        }

        return {
          success: true,
          alreadyOpen: false,
          appName: app.name,
          processName: app.processName,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    return {
      success: false,
      appName: app.name,
      error: lastError || `${app.name} could not be started. Executable not found or process exited immediately.`,
    };
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
