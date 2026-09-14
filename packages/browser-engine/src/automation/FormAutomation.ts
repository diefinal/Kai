import { DomElement } from '../dom/DomElement';
import { DomFormInfo } from '../dom/DomSnapshot';
import { IBrowserTab } from '../BrowserTypes';
import { InputStrategy } from './InputStrategy';
import { ClickStrategy } from './ClickStrategy';
import { ElementResolver } from './ElementResolver';

export interface FormSubmissionResult {
  success: boolean;
  form: DomFormInfo | null;
  submittedFields: Record<string, string>;
  error?: string;
}

export class FormAutomation {
  constructor(
    private readonly inputStrategy: InputStrategy = new InputStrategy(),
    private readonly clickStrategy: ClickStrategy = new ClickStrategy(),
    private readonly resolver: ElementResolver = new ElementResolver()
  ) {}

  findForm(forms: DomFormInfo[], criteria?: string): DomFormInfo | null {
    if (forms.length === 0) return null;
    if (!criteria) return forms[0];

    const target = criteria.toLowerCase();
    return (
      forms.find(
        (f) =>
          f.id?.toLowerCase() === target ||
          f.name?.toLowerCase() === target ||
          f.action?.toLowerCase().includes(target)
      ) || forms[0]
    );
  }

  async fillForm(
    tab: IBrowserTab,
    elements: DomElement[],
    fieldValues: Record<string, string>
  ): Promise<{ filledCount: number; errors: string[] }> {
    let filledCount = 0;
    const errors: string[] = [];

    for (const [key, val] of Object.entries(fieldValues)) {
      const match = this.resolver.resolve(elements, {
        name: key,
        placeholder: key,
        ariaLabel: key,
        id: key,
        text: key,
      });

      if (match) {
        const res = await this.inputStrategy.fill(tab, match.element, val);
        if (res.success) {
          filledCount++;
        } else if (res.error) {
          errors.push(res.error);
        }
      } else {
        errors.push(`Could not resolve form field "${key}".`);
      }
    }

    return { filledCount, errors };
  }

  async submitForm(
    tab: IBrowserTab,
    elements: DomElement[],
    form: DomFormInfo | null
  ): Promise<FormSubmissionResult> {
    // Look for submit button
    const submitMatch =
      this.resolver.resolve(elements, {
        type: 'submit',
        role: 'button',
      }) ||
      this.resolver.resolve(elements, {
        text: 'Submit',
        role: 'button',
      }) ||
      this.resolver.resolve(elements, {
        text: 'Giriş',
        role: 'button',
      }) ||
      this.resolver.resolve(elements, {
        text: 'Login',
        role: 'button',
      }) ||
      this.resolver.resolve(elements, {
        role: 'button',
      });

    if (submitMatch) {
      const clickRes = await this.clickStrategy.executeClick(tab, submitMatch);
      return {
        success: clickRes.success,
        form,
        submittedFields: {},
        error: clickRes.error,
      };
    }

    // Direct JS form submit fallback
    try {
      const handle = (tab as any).getPageHandle?.() || (tab as any).pageHandle;
      if (handle?.evaluate) {
        const ok = await handle.evaluate((formId?: string) => {
          const formEl = formId
            ? (document.querySelector(`form#${formId}`) as HTMLFormElement | null)
            : (document.querySelector('form') as HTMLFormElement | null);
          if (formEl) {
            formEl.submit();
            return true;
          }
          return false;
        }, form?.id);

        return {
          success: Boolean(ok),
          form,
          submittedFields: {},
        };
      }
    } catch (err: any) {
      return {
        success: false,
        form,
        submittedFields: {},
        error: err?.message || String(err),
      };
    }

    return {
      success: false,
      form,
      submittedFields: {},
      error: 'No submit button or form element found to submit.',
    };
  }
}
