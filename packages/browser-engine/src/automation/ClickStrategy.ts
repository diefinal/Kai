import { DomElement } from '../dom/DomElement';
import { IBrowserTab, IPlaywrightPageHandle } from '../BrowserTypes';
import { ElementResolver, ResolvedElementMatch } from './ElementResolver';

export interface ClickOptions {
  timeout?: number;
  waitForNavigation?: boolean;
  forceJsClick?: boolean;
}

export interface ClickResult {
  success: boolean;
  clickedElement: DomElement;
  usedSelector: string;
  retried: boolean;
  scrolled: boolean;
  error?: string;
}

export class ClickStrategy {
  constructor(private readonly resolver: ElementResolver = new ElementResolver()) {}

  async executeClick(
    tab: IBrowserTab,
    match: ResolvedElementMatch,
    options: ClickOptions = {}
  ): Promise<ClickResult> {
    const handle = this.getPageHandle(tab);
    const element = match.element;
    const selectorsToTry = [element.selector, ...match.alternativeSelectors];

    let scrolled = false;
    let retried = false;

    // 1. Try clicking with primary or alternative selectors
    for (const selector of selectorsToTry) {
      if (!selector) continue;

      try {
        const success = await this.tryClickSelector(handle, selector, options.forceJsClick);
        if (success) {
          return {
            success: true,
            clickedElement: element,
            usedSelector: selector,
            retried,
            scrolled,
          };
        }
      } catch {
        retried = true;
      }
    }

    // 2. Scroll into view and retry
    try {
      scrolled = true;
      retried = true;
      await this.scrollIntoView(handle, element.selector);

      const success = await this.tryClickSelector(handle, element.selector, false);
      if (success) {
        return {
          success: true,
          clickedElement: element,
          usedSelector: element.selector,
          retried,
          scrolled,
        };
      }
    } catch {
      // Continue to JS click fallback
    }

    // 3. Synthetic JavaScript click fallback
    try {
      const jsClicked = await this.executeJsClick(handle, element.selector);
      if (jsClicked) {
        return {
          success: true,
          clickedElement: element,
          usedSelector: `js:${element.selector}`,
          retried: true,
          scrolled,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        clickedElement: element,
        usedSelector: element.selector,
        retried: true,
        scrolled,
        error: err?.message || String(err),
      };
    }

    return {
      success: false,
      clickedElement: element,
      usedSelector: element.selector,
      retried: true,
      scrolled,
      error: 'Click failed across all primary, alternative, and fallback strategies.',
    };
  }

  private async tryClickSelector(
    handle: IPlaywrightPageHandle,
    selector: string,
    forceJs = false
  ): Promise<boolean> {
    if (forceJs) {
      return this.executeJsClick(handle, selector);
    }

    if (handle.evaluate) {
      return handle.evaluate((sel: string) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return false;
        el.click();
        return true;
      }, selector);
    }

    return false;
  }

  private async scrollIntoView(
    handle: IPlaywrightPageHandle,
    selector: string
  ): Promise<void> {
    if (handle.evaluate) {
      await handle.evaluate((sel: string) => {
        const el = document.querySelector(sel);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      }, selector);
    }
  }

  private async executeJsClick(
    handle: IPlaywrightPageHandle,
    selector: string
  ): Promise<boolean> {
    if (handle.evaluate) {
      return handle.evaluate((sel: string) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return false;
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
      }, selector);
    }
    return false;
  }

  private getPageHandle(tab: IBrowserTab): IPlaywrightPageHandle {
    if ('getPageHandle' in tab && typeof (tab as any).getPageHandle === 'function') {
      return (tab as any).getPageHandle();
    }
    if ('pageHandle' in tab) {
      return (tab as any).pageHandle;
    }
    throw new Error('Tab does not expose page handle.');
  }
}
