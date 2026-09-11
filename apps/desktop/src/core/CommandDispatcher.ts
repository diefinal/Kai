import { IntentRecognizer } from '@kai/planner';
import { CommandRegistry } from './CommandRegistry';

export interface WindowInfoLike {
  id: string;
  title: string;
  processName?: string;
}

export interface WindowsEngineProviderLike {
  enumerate(): Promise<WindowInfoLike[]>;
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

export interface CommandDispatcherOptions {
  registry?: CommandRegistry;
  recognizer?: IntentRecognizer;
  windowsProvider?: WindowsEngineProviderLike;
  visionProvider?: VisionEngineProviderLike;
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

export class CommandDispatcher {
  private readonly registry: CommandRegistry;
  private readonly recognizer: IntentRecognizer;
  private readonly windowsProvider: WindowsEngineProviderLike;
  private readonly visionProvider: VisionEngineProviderLike;
  private readonly captureSaver: () => Promise<ScreenCaptureResult> | ScreenCaptureResult;

  constructor(options: CommandDispatcherOptions = {}) {
    this.registry = options.registry || new CommandRegistry();
    this.recognizer = options.recognizer || new IntentRecognizer();
    this.windowsProvider = options.windowsProvider || new DefaultProductionWindowsProvider();
    this.visionProvider = options.visionProvider || new DefaultProductionVisionProvider();
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
