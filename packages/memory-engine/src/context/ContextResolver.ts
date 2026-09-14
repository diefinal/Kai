import { ConversationContext } from './ConversationContext';
import { ActiveWindowContext, BrowserContext, VisionContext } from './ContextTypes';

export interface ResolvedContext {
  targetApplication?: string;
  targetWindow?: ActiveWindowContext;
  targetBrowser?: BrowserContext;
  reuseVision?: boolean;
  visionResult?: VisionContext;
  parameters: Record<string, unknown>;
}

export class ContextResolver {
  resolve(input: string, context: ConversationContext): ResolvedContext {
    const norm = input.toLowerCase().trim();
    const result: ResolvedContext = {
      parameters: {},
    };

    // 1. Window reference resolution
    const isWindowReference =
      /\b(bu\s+pencere|şu\s+pencere|pencereyi|pencere|this\s+window|the\s+window|current\s+window)\b/i.test(
        norm
      );

    if (isWindowReference) {
      const currentWin = context.currentWindow();
      const currentApp = context.currentApplication();
      if (currentWin) {
        result.targetWindow = currentWin;
        result.targetApplication = currentApp || currentWin.processName || currentWin.title;
        result.parameters.target = result.targetApplication;
      } else if (currentApp) {
        result.targetApplication = currentApp;
        result.parameters.target = currentApp;
      }
    }

    // 2. Browser navigation reference resolution
    const isNavigation =
      /\b(git|navigate|go\s+to|aç|open)\b/i.test(norm) &&
      (/\b(github|youtube|google|site|url|http|www)\b/i.test(norm) ||
        context.currentBrowser() !== null);

    if (isNavigation) {
      const browser = context.currentBrowser();
      if (browser) {
        result.targetBrowser = browser;
        result.targetApplication = browser.browserName;
        result.parameters.browser = browser.browserName;
      } else if (
        context.currentApplication() === 'chrome' ||
        context.currentApplication() === 'edge'
      ) {
        result.targetApplication = context.currentApplication()!;
        result.parameters.browser = context.currentApplication()!;
      }
    }

    // 3. Vision context reuse resolution
    const lastVision = context.lastVisionResult();
    const isVisionQuery =
      /\b(burada|ekranda|metinde|ne\s+görüyorsun|ne\s+var|hata\s+var\s+mı|açıkla|here|on\s+the\s+screen|in\s+the\s+text|what\s+do\s+you\s+see|is\s+there\s+an\s+error)\b/i.test(
        norm
      );

    if (isVisionQuery && lastVision) {
      result.reuseVision = true;
      result.visionResult = lastVision;
      result.parameters.reuseVision = true;
      result.parameters.detectedText = lastVision.detectedText;
      result.parameters.ocrLines = lastVision.ocrLines;
    }

    return result;
  }

  resolveWindowReference(input: string, context: ConversationContext): ActiveWindowContext | null {
    const res = this.resolve(input, context);
    return res.targetWindow || context.currentWindow();
  }

  resolveBrowserReference(input: string, context: ConversationContext): BrowserContext | null {
    const res = this.resolve(input, context);
    return res.targetBrowser || context.currentBrowser();
  }

  canReuseVision(input: string, context: ConversationContext): boolean {
    const res = this.resolve(input, context);
    return Boolean(res.reuseVision);
  }
}
