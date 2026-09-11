export interface CommandPipelineOptions {
  windowsProvider?: any;
  captureProvider?: any;
  ocrProvider?: any;
  outputLogger?: (message: string) => void;
}

export class DefaultWindowsProviderMock {
  async enumerate() {
    return [
      {
        id: '101',
        title: 'Google Chrome',
        processId: 1234,
        processName: 'chrome.exe',
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        isVisible: true,
        isMinimized: false,
        isForeground: true,
        displayId: 'disp-1',
      },
      {
        id: '102',
        title: 'Visual Studio Code',
        processId: 5678,
        processName: 'Code.exe',
        bounds: { x: 100, y: 100, width: 1200, height: 800 },
        isVisible: true,
        isMinimized: false,
        isForeground: false,
        displayId: 'disp-1',
      },
    ];
  }
}

export class DefaultCaptureProviderMock {
  async captureScreen() {
    return {
      width: 1920,
      height: 1080,
      timestamp: Date.now(),
      image: new Uint8Array([255, 255, 255, 255]),
    };
  }
}

export class DefaultOcrProviderMock {
  constructor(
    private readonly lines: string[] = [
      'Google Chrome',
      'GitHub',
      'Merge pull request',
    ]
  ) {}

  async recognize() {
    return this.lines.map((line, idx) => ({
      text: line,
      confidence: 0.95,
      bounds: { x: 10, y: 10 + idx * 30, width: 200, height: 25 },
    }));
  }
}

export class CommandPipeline {
  private readonly windowsProvider: any;
  private readonly captureProvider: any;
  private readonly ocrProvider: any;
  private readonly log: (message: string) => void;

  constructor(options?: CommandPipelineOptions) {
    this.windowsProvider = options?.windowsProvider || new DefaultWindowsProviderMock();
    this.captureProvider = options?.captureProvider || new DefaultCaptureProviderMock();
    this.ocrProvider = options?.ocrProvider || new DefaultOcrProviderMock();
    this.log = options?.outputLogger || ((msg: string) => console.log(msg));
  }

  async executeCommand(command: string): Promise<{ success: boolean; output: string[] }> {
    const trimmed = command.trim();
    const normalized = trimmed.toLowerCase();
    const outputLines: string[] = [];

    const print = (text: string) => {
      outputLines.push(text);
      this.log(text);
    };

    print('Kai >\n');
    print(`${trimmed}\n`);
    print('----------------------\n');

    try {
      // 1. Plan & Schedule
      if (normalized === 'read screen') {
        print('Capturing screen...\n');
        const frame = await this.captureProvider.captureScreen();

        print('OCR...\n');
        const ocrResults = await this.ocrProvider.recognize({
          width: frame.width,
          height: frame.height,
          channels: 4,
          timestamp: frame.timestamp,
          data: frame.image,
        });

        print('Detected text:\n');
        if (ocrResults && ocrResults.length > 0) {
          for (const res of ocrResults) {
            print(`${res.text}\n`);
          }
        } else {
          print('No text detected.\n');
        }

        print('Done.');
        return { success: true, output: outputLines };
      }

      if (normalized === 'list windows') {
        print('Enumerating windows...\n');
        const windows = await this.windowsProvider.enumerate();

        print('Open Windows:\n');
        if (windows && windows.length > 0) {
          for (const win of windows) {
            print(`- [${win.id}] ${win.title} (${win.processName})\n`);
          }
        } else {
          print('No open windows found.\n');
        }

        print('Done.');
        return { success: true, output: outputLines };
      }

      if (normalized === 'capture screen') {
        print('Capturing screen...\n');
        const frame = await this.captureProvider.captureScreen();
        print(`Screen captured: ${frame.width}x${frame.height} (${frame.image.length} bytes)\n`);
        print('Done.');
        return { success: true, output: outputLines };
      }

      // Unknown command
      print(`Unknown command: "${trimmed}". Supported commands: Read Screen, List Windows, Capture Screen\n`);
      print('Done.');
      return { success: false, output: outputLines };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      print(`Execution error: ${errorMsg}\n`);
      return { success: false, output: outputLines };
    }
  }
}

export async function runCli(command: string = 'Read Screen', options?: CommandPipelineOptions) {
  const pipeline = new CommandPipeline(options);
  return pipeline.executeCommand(command);
}
