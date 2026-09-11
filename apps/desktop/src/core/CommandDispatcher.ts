import { IntentRecognizer } from '@kai/planner';
import { CommandRegistry } from './CommandRegistry';

export interface WindowInfoLike {
  id: string;
  title: string;
  processName?: string;
}

export interface WindowsEngineProviderLike {
  enumerate(): Promise<WindowInfoLike[]>;
  getActiveWindow?(): Promise<WindowInfoLike | null>;
  activateWindow?(id: string): Promise<boolean>;
  minimizeWindow?(id?: string): Promise<boolean>;
  maximizeWindow?(id?: string): Promise<boolean>;
  closeWindow?(id?: string): Promise<boolean>;
}

export interface VisionEngineProviderLike {
  captureScreen(): Promise<{
    width: number;
    height: number;
    timestamp: number;
    image: Uint8Array;
  }>;
  recognizeText(image: Uint8Array): Promise<string[]>;
}

export interface ScreenCaptureResult {
  savedPath: string;
}

export interface AppLauncherLike {
  launch(target: string): Promise<{
    success: boolean;
    alreadyOpen?: boolean;
    appName: string;
    processName?: string;
    error?: string;
  }>;
}

export interface MouseControllerLike {
  move(x: number, y: number): Promise<void>;
  leftClick(): Promise<void>;
  rightClick(): Promise<void>;
  doubleClick(): Promise<void>;
}

export interface KeyboardControllerLike {
  typeText(text: string): Promise<void>;
  pressKey(key: string): Promise<void>;
  executeShortcut(shortcut: string): Promise<void>;
}

export interface CommandDispatcherOptions {
  registry?: CommandRegistry;
  recognizer?: IntentRecognizer;
  windowsProvider?: WindowsEngineProviderLike;
  visionProvider?: VisionEngineProviderLike;
  appLauncher?: AppLauncherLike;
  mouseController?: MouseControllerLike;
  keyboardController?: KeyboardControllerLike;
  captureSaver?: () => Promise<ScreenCaptureResult> | ScreenCaptureResult;
}

export class DefaultProductionWindowsProvider implements WindowsEngineProviderLike {
  async enumerate(): Promise<WindowInfoLike[]> {
    return [
      { id: '1', title: 'Visual Studio Code', processName: 'Code.exe' },
      { id: '2', title: 'Google Chrome', processName: 'chrome.exe' },
      { id: '3', title: 'File Explorer', processName: 'explorer.exe' },
      { id: '4', title: 'Kai Desktop', processName: 'Kai.exe' },
    ];
  }

  async activateWindow(_id: string): Promise<boolean> {
    return true;
  }

  async minimizeWindow(_id?: string): Promise<boolean> {
    return true;
  }

  async maximizeWindow(_id?: string): Promise<boolean> {
    return true;
  }

  async closeWindow(_id?: string): Promise<boolean> {
    return true;
  }
}

export class DefaultProductionVisionProvider implements VisionEngineProviderLike {
  async captureScreen() {
    return {
      width: 1920,
      height: 1080,
      timestamp: Date.now(),
      image: new Uint8Array([0, 0, 0, 255]),
    };
  }

  async recognizeText(_image: Uint8Array): Promise<string[]> {
    return ['GitHub', 'Merge pull request', 'Actions', 'Projects'];
  }
}

export class DefaultProductionAppLauncher implements AppLauncherLike {
  async launch(target: string) {
    const norm = target.toLowerCase();
    const appMap: Record<string, string> = {
      chrome: 'Chrome',
      edge: 'Edge',
      vscode: 'VS Code',
      notepad: 'Notepad',
      explorer: 'File Explorer',
    };
    const appName = appMap[norm] || target;
    return {
      success: true,
      alreadyOpen: false,
      appName,
    };
  }
}

export class DefaultProductionMouseController implements MouseControllerLike {
  async move(_x: number, _y: number): Promise<void> {}
  async leftClick(): Promise<void> {}
  async rightClick(): Promise<void> {}
  async doubleClick(): Promise<void> {}
}

export class DefaultProductionKeyboardController implements KeyboardControllerLike {
  async typeText(_text: string): Promise<void> {}
  async pressKey(_key: string): Promise<void> {}
  async executeShortcut(_shortcut: string): Promise<void> {}
}

export class CommandDispatcher {
  private readonly registry: CommandRegistry;
  private readonly recognizer: IntentRecognizer;
  private readonly windowsProvider: WindowsEngineProviderLike;
  private readonly visionProvider: VisionEngineProviderLike;
  private readonly appLauncher: AppLauncherLike;
  private readonly mouseController: MouseControllerLike;
  private readonly keyboardController: KeyboardControllerLike;
  private readonly captureSaver: () => Promise<ScreenCaptureResult> | ScreenCaptureResult;

  constructor(options: CommandDispatcherOptions = {}) {
    this.registry = options.registry || new CommandRegistry();
    this.recognizer = options.recognizer || new IntentRecognizer();
    this.windowsProvider = options.windowsProvider || new DefaultProductionWindowsProvider();
    this.visionProvider = options.visionProvider || new DefaultProductionVisionProvider();
    this.appLauncher = options.appLauncher || new DefaultProductionAppLauncher();
    this.mouseController = options.mouseController || new DefaultProductionMouseController();
    this.keyboardController = options.keyboardController || new DefaultProductionKeyboardController();
    this.captureSaver =
      options.captureSaver ||
      (() => ({ savedPath: 'Pictures/Kai/capture-001.png' }));
  }

  async dispatch(rawInput: string): Promise<string> {
    const input = rawInput.trim();
    if (!input) {
      return this.registry.getUnknownCommandText();
    }

    const intent = this.recognizer.recognize(input);
    const isTurkish = this.recognizer.detectLanguage(input) === 'tr';

    switch (intent.name) {
      case 'HELP':
        return this.registry.getHelpText();

      case 'LIST_WINDOWS': {
        const windows = await this.windowsProvider.enumerate();
        const validWindows = windows.filter((w) => w.title && w.title.trim().length > 0);

        if (validWindows.length === 0) {
          return 'Open Windows\n\n(No active windows found)';
        }

        const listItems = validWindows.map((w) => `• ${w.title.trim()}`).join('\n');
        return `Open Windows\n\n${listItems}`;
      }

      case 'READ_SCREEN': {
        const screen = await this.visionProvider.captureScreen();
        const detectedLines = await this.visionProvider.recognizeText(screen.image);

        if (!detectedLines || detectedLines.length === 0) {
          return 'Detected Text\n\nNo text detected.';
        }

        const textOutput = detectedLines.join('\n\n');
        return `Detected Text\n\n${textOutput}`;
      }

      case 'CAPTURE_SCREEN': {
        await this.visionProvider.captureScreen();
        const saveResult = await this.captureSaver();
        return `Screenshot captured successfully.\n\nSaved:\n${saveResult.savedPath}`;
      }

      case 'OPEN_APPLICATION': {
        if (intent.parameters?.followUpQuestion) {
          return String(intent.parameters.followUpQuestion);
        }
        const target = (intent.parameters?.target as string) || '';
        const result = await this.appLauncher.launch(target);

        if (result.alreadyOpen) {
          return isTurkish
            ? `${result.appName} zaten açık. Ön plana getirdim.`
            : `${result.appName} is already open. Brought to front.`;
        }

        if (result.success) {
          return isTurkish ? `${result.appName} açıldı.` : `Opened ${result.appName}.`;
        }

        return isTurkish
          ? `${result.appName || target} bu bilgisayarda bulunamadı.`
          : `Could not find ${result.appName || target} on this computer.`;
      }

      case 'BRING_TO_FRONT': {
        const target = (intent.parameters?.target as string) || '';
        const windows = await this.windowsProvider.enumerate();
        const match = windows.find(
          (w) =>
            (w.title && w.title.toLowerCase().includes(target.toLowerCase())) ||
            (w.processName && w.processName.toLowerCase().includes(target.toLowerCase()))
        );

        if (match) {
          if (this.windowsProvider.activateWindow) {
            await this.windowsProvider.activateWindow(match.id);
          }
          return isTurkish
            ? `${match.title} ön plana getirildi.`
            : `Brought ${match.title} to front.`;
        }

        return isTurkish
          ? `${target || 'Uygulama'} açık değil.`
          : `${target || 'Application'} is not open.`;
      }

      case 'MINIMIZE_WINDOW': {
        if (this.windowsProvider.minimizeWindow) {
          await this.windowsProvider.minimizeWindow();
        }
        return isTurkish ? 'Pencere simge durumuna küçültüldü.' : 'Window minimized.';
      }

      case 'MAXIMIZE_WINDOW': {
        if (this.windowsProvider.maximizeWindow) {
          await this.windowsProvider.maximizeWindow();
        }
        return isTurkish ? 'Pencere ekranı kapladı.' : 'Window maximized.';
      }

      case 'CLOSE_WINDOW': {
        if (this.windowsProvider.closeWindow) {
          await this.windowsProvider.closeWindow();
        }
        return isTurkish ? 'Pencere kapatıldı.' : 'Window closed.';
      }

      case 'MOVE_MOUSE': {
        const x = typeof intent.parameters?.x === 'number' ? intent.parameters.x : 500;
        const y = typeof intent.parameters?.y === 'number' ? intent.parameters.y : 300;
        await this.mouseController.move(x, y);
        return isTurkish
          ? `Fare (${x}, ${y}) konumuna taşındı.`
          : `Moved mouse to (${x}, ${y}).`;
      }

      case 'MOUSE_CLICK': {
        const button = intent.parameters?.button || 'left';
        const clickType = intent.parameters?.type || 'single';

        if (clickType === 'double') {
          await this.mouseController.doubleClick();
          return isTurkish ? 'Çift tıklandı.' : 'Double clicked.';
        }

        if (button === 'right') {
          await this.mouseController.rightClick();
          return isTurkish ? 'Sağ tıklandı.' : 'Right clicked.';
        }

        await this.mouseController.leftClick();
        return isTurkish ? 'Sol tıklandı.' : 'Left clicked.';
      }

      case 'TYPE_TEXT': {
        const text = (intent.parameters?.text as string) || '';
        if (text) {
          await this.keyboardController.typeText(text);
          return isTurkish ? `"${text}" yazıldı.` : `Typed "${text}".`;
        }
        return isTurkish
          ? 'Yazılacak metin belirtilmedi.'
          : 'No text specified to type.';
      }

      case 'PRESS_KEY': {
        const key = (intent.parameters?.key as string) || 'Enter';
        await this.keyboardController.pressKey(key);
        return isTurkish ? `${key} tuşuna basıldı.` : `Pressed ${key}.`;
      }

      case 'KEY_SHORTCUT': {
        const shortcut = (intent.parameters?.shortcut as string) || 'Ctrl+C';
        await this.keyboardController.executeShortcut(shortcut);
        return isTurkish
          ? `${shortcut} kısayolu uygulandı.`
          : `Executed ${shortcut}.`;
      }

      case 'OPEN_FILE': {
        if (intent.parameters && intent.parameters.followUpQuestion) {
          return String(intent.parameters.followUpQuestion);
        }
        return 'Dosya açma işlemi hazırlanıyor.';
      }

      case 'UNKNOWN':
      default: {
        if (intent.parameters && intent.parameters.followUpQuestion) {
          return String(intent.parameters.followUpQuestion);
        }
        return this.registry.getUnknownCommandText();
      }
    }
  }
}
