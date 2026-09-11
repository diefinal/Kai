export class CaptureProviderMock {
  async captureScreen() {
    return {
      width: 1920,
      height: 1080,
      timestamp: Date.now(),
      image: new Uint8Array([255, 255, 255, 255]),
    };
  }
}

export class OcrProviderMock {
  constructor(private readonly mockText: string = 'Welcome to Kai Desktop Assistant') {}

  async recognize() {
    return [
      {
        text: this.mockText,
        confidence: 0.98,
        bounds: { x: 100, y: 100, width: 400, height: 50 },
      },
    ];
  }
}

export interface DemoOptions {
  captureSource?: any;
  ocrProvider?: any;
}

export async function runDemo(options?: DemoOptions): Promise<void> {
  try {
    console.log('[KAI]\n');

    // 1. Initialize Windows Engine / Capture Provider
    const captureProvider = options?.captureSource || new CaptureProviderMock();
    console.log('Windows Engine initialized\n');

    // 2. Initialize Vision Engine / OCR Provider
    const ocrProvider = options?.ocrProvider || new OcrProviderMock();
    console.log('Vision Engine initialized\n');

    // 3. Capture current screen
    console.log('Capturing screen...\n');
    const screenCapture = await captureProvider.captureScreen();

    // 4. Pass image to Vision Capture Pipeline
    const imageFrame = {
      width: screenCapture.width,
      height: screenCapture.height,
      channels: 4,
      timestamp: screenCapture.timestamp,
      data: screenCapture.image,
    };

    // 5. Run OCR Engine
    console.log('Running OCR...\n');
    const results = await ocrProvider.recognize(imageFrame);

    // 6. Print detected text
    console.log('Detected text:\n');
    console.log('----------------------------\n');

    if (results && results.length > 0) {
      const fullText = results.map((r: { text: string }) => r.text).join('\n');
      if (fullText.trim().length > 0) {
        console.log(fullText);
      } else {
        console.log('No text detected.');
      }
    } else {
      console.log('No text detected.');
    }

    console.log('\n----------------------------\n');
    console.log('Done.');
  } catch (error) {
    console.error('[KAI] An error occurred during the demo execution:', error);
  }
}

// Execute when run directly as CLI entrypoint
if (require.main === module) {
  runDemo().catch((err) => {
    console.error('[KAI] Fatal demo error:', err);
  });
}
