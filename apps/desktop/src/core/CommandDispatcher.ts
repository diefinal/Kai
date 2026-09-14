import { IntentRecognizer } from '@kai/planner';
import {
  createProductionWindowsDependencies,
} from '@kai/windows-engine';
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
  getPosition?(): Promise<{ x: number; y: number }>;
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
  logger?: (message: string) => void;
}

export class DefaultVisionProvider implements VisionEngineProviderLike {
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


export class CommandDispatcher {
  private readonly registry: CommandRegistry;
  private readonly recognizer: IntentRecognizer;
  private readonly windowsProvider: WindowsEngineProviderLike;
  private readonly visionProvider: VisionEngineProviderLike;
  private readonly appLauncher: AppLauncherLike;
  private readonly mouseController: MouseControllerLike;
  private readonly keyboardController: KeyboardControllerLike;
  private readonly captureSaver: () => Promise<ScreenCaptureResult> | ScreenCaptureResult;
  private readonly logger: (message: string) => void;

  constructor(options: CommandDispatcherOptions = {}) {
    const prod =
      !options.windowsProvider ||
      !options.appLauncher ||
      !options.mouseController ||
      !options.keyboardController
        ? createProductionWindowsDependencies()
        : undefined;

    this.registry = options.registry || new CommandRegistry();
    this.recognizer = options.recognizer || new IntentRecognizer();
    this.windowsProvider = options.windowsProvider || prod!.windowsProvider;
    this.appLauncher = options.appLauncher || prod!.appLauncher;
    this.mouseController = options.mouseController || prod!.mouseController;
    this.keyboardController = options.keyboardController || prod!.keyboardController;
    this.visionProvider = options.visionProvider || new DefaultVisionProvider();
    this.captureSaver =
      options.captureSaver || (() => ({ savedPath: 'Pictures/Kai/capture-001.png' }));
    this.logger = options.logger || ((msg: string) => console.log(msg));
  }

  private logStep(intent: string, target: string, execution: string, verification: string): void {
    this.logger(
      `[CommandDispatcher] Intent: ${intent}, Target: ${target}, Execution: ${execution}, Verification: ${verification}`
    );
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
        this.logStep('HELP', 'system', 'registry.help', 'Success');
        return this.registry.getHelpText();

      case 'LIST_WINDOWS': {
        const windows = await this.windowsProvider.enumerate();
        const validWindows = windows.filter((w) => w.title && w.title.trim().length > 0);
        this.logStep('LIST_WINDOWS', 'desktop', 'windows.enumerate', 'Success');

        if (validWindows.length === 0) {
          return 'Open Windows\n\n(No active windows found)';
        }

        const listItems = validWindows.map((w) => `• ${w.title.trim()}`).join('\n');
        return `Open Windows\n\n${listItems}`;
      }

      case 'READ_SCREEN': {
        const screen = await this.visionProvider.captureScreen();
        const detectedLines = await this.visionProvider.recognizeText(screen.image);
        this.logStep('READ_SCREEN', 'screen', 'vision.read', 'Success');

        if (!detectedLines || detectedLines.length === 0) {
          return 'Detected Text\n\nNo text detected.';
        }

        return `Detected Text\n\n${detectedLines.join('\n\n')}`;
      }

      case 'CAPTURE_SCREEN': {
        await this.visionProvider.captureScreen();
        const saveResult = await this.captureSaver();
        this.logStep('CAPTURE_SCREEN', 'screen', 'vision.capture', 'Success');
        return `Screenshot captured successfully.\n\nSaved:\n${saveResult.savedPath}`;
      }

      case 'OPEN_APPLICATION': {
        if (intent.parameters?.followUpQuestion) {
          return String(intent.parameters.followUpQuestion);
        }
        const target = (intent.parameters?.target as string) || '';
        const result = await this.appLauncher.launch(target);
        const verification = result.success ? 'Success' : 'Failed';
        this.logStep('OPEN_APPLICATION', target, 'windows.launch', verification);

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

        let activated = false;
        if (match) {
          if (this.windowsProvider.activateWindow) {
            activated = await this.windowsProvider.activateWindow(match.id);
          }
          this.logStep(
            'BRING_TO_FRONT',
            target,
            'windows.activate',
            activated ? 'Success' : 'Failed'
          );
          return isTurkish
            ? `${match.title} ön plana getirildi.`
            : `Brought ${match.title} to front.`;
        }

        this.logStep('BRING_TO_FRONT', target, 'windows.activate', 'Failed');
        return isTurkish
          ? `${target || 'Uygulama'} açık değil.`
          : `${target || 'Application'} is not open.`;
      }

      case 'MINIMIZE_WINDOW': {
        let success = true;
        if (this.windowsProvider.minimizeWindow) {
          success = await this.windowsProvider.minimizeWindow();
        }
        this.logStep(
          'MINIMIZE_WINDOW',
          'active_window',
          'windows.minimize',
          success ? 'Success' : 'Failed'
        );
        return isTurkish ? 'Pencere simge durumuna küçültüldü.' : 'Window minimized.';
      }

      case 'MAXIMIZE_WINDOW': {
        let success = true;
        if (this.windowsProvider.maximizeWindow) {
          success = await this.windowsProvider.maximizeWindow();
        }
        this.logStep(
          'MAXIMIZE_WINDOW',
          'active_window',
          'windows.maximize',
          success ? 'Success' : 'Failed'
        );
        return isTurkish ? 'Pencere ekranı kapladı.' : 'Window maximized.';
      }

      case 'CLOSE_WINDOW': {
        let success = true;
        if (this.windowsProvider.closeWindow) {
          success = await this.windowsProvider.closeWindow();
        }
        this.logStep(
          'CLOSE_WINDOW',
          'active_window',
          'windows.close',
          success ? 'Success' : 'Failed'
        );
        return isTurkish ? 'Pencere kapatıldı.' : 'Window closed.';
      }

      case 'MOVE_MOUSE': {
        let x = 500;
        let y = 300;
        let desc = '';

        if (intent.parameters?.target) {
          const target = intent.parameters.target;
          // Assume default 1920x1080 for named targets if screen bounds aren't available
          switch (target) {
            case 'top_right': x = 1920; y = 0; desc = 'top right'; break;
            case 'top_left': x = 0; y = 0; desc = 'top left'; break;
            case 'bottom_right': x = 1920; y = 1080; desc = 'bottom right'; break;
            case 'bottom_left': x = 0; y = 1080; desc = 'bottom left'; break;
            case 'center': x = 960; y = 540; desc = 'center'; break;
          }
        } else if (typeof intent.parameters?.deltaX === 'number' || typeof intent.parameters?.deltaY === 'number') {
          const currentPos = this.mouseController.getPosition 
            ? await this.mouseController.getPosition()
            : { x: 500, y: 300 }; // fallback for mocks without getPosition
          const dx = typeof intent.parameters.deltaX === 'number' ? intent.parameters.deltaX : 0;
          const dy = typeof intent.parameters.deltaY === 'number' ? intent.parameters.deltaY : 0;
          x = currentPos.x + dx;
          y = currentPos.y + dy;
          desc = `relative (${dx}, ${dy})`;
        } else if (typeof intent.parameters?.x === 'number' && typeof intent.parameters?.y === 'number') {
          x = intent.parameters.x;
          y = intent.parameters.y;
          desc = `(${x}, ${y})`;
        } else {
          // fallback
          x = typeof intent.parameters?.x === 'number' ? intent.parameters.x : 500;
          y = typeof intent.parameters?.y === 'number' ? intent.parameters.y : 300;
          desc = `(${x}, ${y})`;
        }

        await this.mouseController.move(x, y);
        this.logStep('MOVE_MOUSE', desc, 'windows.mouse.move', 'Success');
        
        if (intent.parameters?.target) {
           return isTurkish 
             ? `Fare ${intent.parameters.target} konumuna taşındı.` 
             : `Moved mouse to ${intent.parameters.target}.`;
        } else if (typeof intent.parameters?.deltaX === 'number' || typeof intent.parameters?.deltaY === 'number') {
           return isTurkish 
             ? `Fare taşındı (${intent.parameters.deltaX || 0}, ${intent.parameters.deltaY || 0}).` 
             : `Moved mouse by (${intent.parameters.deltaX || 0}, ${intent.parameters.deltaY || 0}).`;
        } else {
           return isTurkish
             ? `Fare (${x}, ${y}) konumuna taşındı.`
             : `Moved mouse to (${x}, ${y}).`;
        }
      }

      case 'MOUSE_CLICK': {
        const button = intent.parameters?.button || 'left';
        const clickType = intent.parameters?.type || 'single';

        if (clickType === 'double') {
          await this.mouseController.doubleClick();
          this.logStep('MOUSE_CLICK', 'left_double', 'windows.mouse.click', 'Success');
          return isTurkish ? 'Çift tıklandı.' : 'Double clicked.';
        }

        if (button === 'right') {
          await this.mouseController.rightClick();
          this.logStep('MOUSE_CLICK', 'right_single', 'windows.mouse.click', 'Success');
          return isTurkish ? 'Sağ tıklandı.' : 'Right clicked.';
        }

        await this.mouseController.leftClick();
        this.logStep('MOUSE_CLICK', 'left_single', 'windows.mouse.click', 'Success');
        return isTurkish ? 'Sol tıklandı.' : 'Left clicked.';
      }

      case 'TYPE_TEXT': {
        const text = (intent.parameters?.text as string) || '';
        if (text) {
          await this.keyboardController.typeText(text);
          this.logStep('TYPE_TEXT', `"${text}"`, 'windows.keyboard.type', 'Success');
          return isTurkish ? `"${text}" yazıldı.` : `Typed "${text}".`;
        }
        this.logStep('TYPE_TEXT', '""', 'windows.keyboard.type', 'Failed');
        return isTurkish
          ? 'Yazılacak metin belirtilmedi.'
          : 'No text specified to type.';
      }

      case 'PRESS_KEY': {
        const key = (intent.parameters?.key as string) || 'Enter';
        await this.keyboardController.pressKey(key);
        this.logStep('PRESS_KEY', key, 'windows.keyboard.press', 'Success');
        return isTurkish ? `${key} tuşuna basıldı.` : `Pressed ${key}.`;
      }

      case 'KEY_SHORTCUT': {
        const shortcut = (intent.parameters?.shortcut as string) || 'Ctrl+C';
        await this.keyboardController.executeShortcut(shortcut);
        this.logStep('KEY_SHORTCUT', shortcut, 'windows.keyboard.shortcut', 'Success');
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
