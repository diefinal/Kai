import { VerificationContext } from './VerificationContext';
import { VerificationResult } from './VerificationResult';

export interface IVerifier {
  canVerify(action: string): boolean;
  verify(context: VerificationContext): Promise<VerificationResult> | VerificationResult;
}

export class BrowserVerifier implements IVerifier {
  private readonly handledActions = new Set([
    'OPEN_BROWSER',
    'NAVIGATE',
    'QUERY_DOM',
    'READ_DOM',
    'GET_DOM',
    'NEW_TAB',
    'CLOSE_TAB',
    'SWITCH_TAB',
    'CLICK_ELEMENT',
    'RELOAD_PAGE',
    'BACK',
    'FORWARD',
    'GET_CURRENT_URL',
  ]);

  canVerify(action: string): boolean {
    return this.handledActions.has(action.toUpperCase());
  }

  verify(context: VerificationContext): VerificationResult {
    const action = context.action.toUpperCase();
    const bState = context.browserState;
    const output = context.output as Record<string, unknown> | undefined;

    if (action === 'OPEN_BROWSER') {
      const isOpen = bState?.isOpen ?? Boolean(output?.sessionId || output?.browserType);
      if (isOpen) {
        return {
          success: true,
          confidence: 0.95,
          retrySuggested: false,
        };
      }
      return {
        success: false,
        confidence: 0.85,
        reason: 'Browser process or session is not active.',
        retrySuggested: true,
      };
    }

    if (action === 'NAVIGATE') {
      const targetUrl = (context.parameters.url as string) || '';
      const currentUrl = bState?.currentUrl || (output?.url as string) || '';

      if (!bState && !currentUrl) {
        return {
          success: true,
          confidence: 0.85,
          retrySuggested: false,
        };
      }

      if (!currentUrl) {
        return {
          success: false,
          confidence: 0.8,
          reason: 'Current browser URL could not be determined.',
          retrySuggested: true,
        };
      }

      const cleanTarget = targetUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
      const cleanCurrent = currentUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

      if (cleanCurrent.includes(cleanTarget) || cleanTarget.includes(cleanCurrent)) {
        return {
          success: true,
          confidence: 0.95,
          retrySuggested: false,
        };
      }

      return {
        success: false,
        confidence: 0.9,
        reason: `Current URL "${currentUrl}" does not match target URL "${targetUrl}" (URL mismatch).`,
        retrySuggested: true,
      };
    }

    if (action === 'CLOSE_TAB') {
      const tabId = context.parameters.tabId as string | undefined;
      const tabIds = bState?.tabIds;
      if (tabId && Array.isArray(tabIds)) {
        const stillOpen = tabIds.includes(tabId);
        if (stillOpen) {
          return {
            success: false,
            confidence: 0.95,
            reason: `Tab ${tabId} is still open.`,
            retrySuggested: true,
          };
        }
        return {
          success: true,
          confidence: 1.0,
          retrySuggested: false,
        };
      }
      return {
        success: true,
        confidence: 0.9,
        retrySuggested: false,
      };
    }


    if (action === 'CLICK_ELEMENT' || action === 'MOUSE_CLICK') {
      const domChanged = bState?.domChanged ?? false;
      const loadingStarted = bState?.loadingStarted ?? false;
      if (domChanged || loadingStarted || output?.success) {
        return {
          success: true,
          confidence: 0.9,
          retrySuggested: false,
        };
      }
      return {
        success: false,
        confidence: 0.75,
        reason: 'Click action did not cause expected DOM modification or navigation.',
        retrySuggested: true,
      };
    }

    if (action === 'QUERY_DOM') {
      const count =
        context.browserState?.elementCount ??
        (output?.count as number) ??
        (Array.isArray(output?.elements) ? output.elements.length : 0);
      if (count > 0 || (output?.elements && (output.elements as unknown[]).length > 0)) {
        return {
          success: true,
          confidence: 0.95,
          retrySuggested: false,
        };
      }

      return {
        success: false,
        confidence: 0.8,
        reason: 'DOM query did not match any elements.',
        retrySuggested: true,
      };
    }

    // Default for tabs / reloads / generic browser actions
    if (output && !context.error) {
      return {
        success: true,
        confidence: 0.9,
        retrySuggested: false,
      };
    }

    return {
      success: false,
      confidence: 0.7,
      reason: 'Browser action produced an error or empty result.',
      retrySuggested: true,
    };
  }
}

export class DesktopVerifier implements IVerifier {
  private readonly handledActions = new Set([
    'OPEN_APPLICATION',
    'BRING_TO_FRONT',
    'MAXIMIZE_WINDOW',
    'MINIMIZE_WINDOW',
    'CLOSE_WINDOW',
    'CLOSE_APPLICATION',
  ]);

  canVerify(action: string): boolean {
    return this.handledActions.has(action.toUpperCase());
  }

  verify(context: VerificationContext): VerificationResult {
    const action = context.action.toUpperCase();
    const dState = context.desktopState;
    const output = context.output as Record<string, unknown> | undefined;

    if (action === 'OPEN_APPLICATION') {
      const target =
        (context.parameters?.target as string) ||
        (context.parameters?.appName as string) ||
        'chrome';
      const processExists =
        dState?.isProcessRunning !== undefined
          ? dState.isProcessRunning
          : (dState?.processExists ?? true);
      const windowVisible =
        dState?.isWindowVisible !== undefined
          ? dState.isWindowVisible
          : (dState?.windowVisible ?? true);

      if (!processExists) {
        return {
          success: false,
          confidence: 0.95,
          reason: `Process ${target} is not running.`,
          retrySuggested: true,
        };
      }

      if (windowVisible) {
        return {
          success: true,
          confidence: 1.0,
          retrySuggested: false,
        };
      }

      return {
        success: false,
        confidence: 0.85,
        reason: `Window for ${target} is not visible.`,
        retrySuggested: true,
      };
    }

    if (action === 'BRING_TO_FRONT') {
      if (dState?.isForeground ?? output?.success ?? true) {
        return {
          success: true,
          confidence: 0.95,
          retrySuggested: false,
        };
      }
      return {
        success: false,
        confidence: 0.8,
        reason: 'Window is not in the foreground.',
        retrySuggested: true,
      };
    }

    if (action === 'CLOSE_WINDOW' || action === 'CLOSE_APPLICATION') {
      if (dState && dState.processExists === false) {
        return {
          success: true,
          confidence: 0.98,
          retrySuggested: false,
        };
      }
      return {
        success: true,
        confidence: 0.85,
        retrySuggested: false,
      };
    }

    return {
      success: !context.error,
      confidence: 0.8,
      reason: context.error ? String(context.error) : undefined,
      retrySuggested: Boolean(context.error),
    };
  }
}

export class VisionVerifier implements IVerifier {
  private readonly handledActions = new Set([
    'READ_SCREEN',
    'CAPTURE_SCREEN',
    'ANALYZE_SCREEN_TEXT',
    'OCR',
  ]);

  canVerify(action: string): boolean {
    return this.handledActions.has(action.toUpperCase());
  }

  verify(context: VerificationContext): VerificationResult {
    const vState = context.visionState;
    const output = context.output;
    const expectedText = context.parameters?.expectedText as string | undefined;

    let textLength = vState?.textLength ?? 0;
    if (!textLength && vState?.detectedText) {
      textLength = vState.detectedText.trim().length;
    }
    if (!textLength && typeof output === 'string') {
      textLength = output.trim().length;
    }
    if (!textLength && Array.isArray(output)) {
      textLength = output.join(' ').trim().length;
    }

    const ocrDone = vState?.ocrCompleted ?? (Boolean(output) || textLength > 0);

    if (expectedText) {
      const allText =
        vState?.detectedText ||
        (Array.isArray(vState?.ocrLines) ? vState.ocrLines.join(' ') : '') ||
        (typeof output === 'string' ? output : '');
      if (!allText.toLowerCase().includes(expectedText.toLowerCase())) {
        return {
          success: false,
          confidence: 0.9,
          reason: `Expected text "${expectedText}" not detected on screen.`,
          retrySuggested: true,
        };
      }
    }

    if (ocrDone && textLength > 0) {
      return {
        success: true,
        confidence: 1.0,
        retrySuggested: false,
      };
    }

    if (ocrDone && textLength === 0) {
      return {
        success: false,
        confidence: 0.85,
        reason: 'Screen capture OCR completed but detected text is empty.',
        retrySuggested: true,
      };
    }

    return {
      success: false,
      confidence: 0.75,
      reason: 'OCR screen reading failed or produced no output.',
      retrySuggested: true,
    };
  }
}


export class DefaultVerifier implements IVerifier {
  canVerify(_action: string): boolean {
    return true;
  }

  verify(context: VerificationContext): VerificationResult {
    if (context.error) {
      return {
        success: false,
        confidence: 0.9,
        reason: typeof context.error === 'string' ? context.error : (context.error as Error).message || 'Action failed',
        retrySuggested: true,
      };
    }

    return {
      success: true,
      confidence: 0.8,
      retrySuggested: false,
    };
  }

}
