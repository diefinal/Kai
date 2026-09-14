import { DomElement } from '../dom/DomElement';
import { IBrowserTab, IPlaywrightPageHandle } from '../BrowserTypes';

export interface FillResult {
  success: boolean;
  element: DomElement;
  value: string;
  error?: string;
}

export interface SelectResult {
  success: boolean;
  element: DomElement;
  selectedOption: string;
  error?: string;
}

export interface CheckResult {
  success: boolean;
  element: DomElement;
  checked: boolean;
  error?: string;
}

export class InputStrategy {
  async fill(
    tab: IBrowserTab,
    element: DomElement,
    value: string
  ): Promise<FillResult> {
    const handle = this.getPageHandle(tab);

    try {
      if (handle.evaluate) {
        const ok = await handle.evaluate(
          ({ sel, val }: { sel: string; val: string }) => {
            const el = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement | null;
            if (!el) return false;

            el.focus();
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.blur();
            return true;
          },
          { sel: element.selector, val: value }
        );

        if (ok) {
          return { success: true, element, value };
        }
      }

      return {
        success: false,
        element,
        value,
        error: `Element with selector "${element.selector}" could not be filled.`,
      };
    } catch (err: any) {
      return {
        success: false,
        element,
        value,
        error: err?.message || String(err),
      };
    }
  }

  async select(
    tab: IBrowserTab,
    element: DomElement,
    optionValue: string
  ): Promise<SelectResult> {
    const handle = this.getPageHandle(tab);

    try {
      if (handle.evaluate) {
        const ok = await handle.evaluate(
          ({ sel, opt }: { sel: string; opt: string }) => {
            const selectEl = document.querySelector(sel) as HTMLSelectElement | null;
            if (!selectEl) return false;

            let matched = false;
            for (let i = 0; i < selectEl.options.length; i++) {
              const option = selectEl.options[i];
              if (
                option.value === opt ||
                option.text.trim().toLowerCase() === opt.trim().toLowerCase()
              ) {
                selectEl.selectedIndex = i;
                matched = true;
                break;
              }
            }

            if (matched) {
              selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return matched;
          },
          { sel: element.selector, opt: optionValue }
        );

        if (ok) {
          return { success: true, element, selectedOption: optionValue };
        }
      }

      return {
        success: false,
        element,
        selectedOption: optionValue,
        error: `Option "${optionValue}" could not be selected.`,
      };
    } catch (err: any) {
      return {
        success: false,
        element,
        selectedOption: optionValue,
        error: err?.message || String(err),
      };
    }
  }

  async check(
    tab: IBrowserTab,
    element: DomElement,
    checked = true
  ): Promise<CheckResult> {
    const handle = this.getPageHandle(tab);

    try {
      if (handle.evaluate) {
        const ok = await handle.evaluate(
          ({ sel, chk }: { sel: string; chk: boolean }) => {
            const el = document.querySelector(sel) as HTMLInputElement | null;
            if (!el) return false;

            el.checked = chk;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          },
          { sel: element.selector, chk: checked }
        );

        if (ok) {
          return { success: true, element, checked };
        }
      }

      return {
        success: false,
        element,
        checked,
        error: `Checkbox "${element.selector}" could not be checked.`,
      };
    } catch (err: any) {
      return {
        success: false,
        element,
        checked,
        error: err?.message || String(err),
      };
    }
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
