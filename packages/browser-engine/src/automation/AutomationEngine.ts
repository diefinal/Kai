import { DomElement } from '../dom/DomElement';
import { DomFormInfo } from '../dom/DomSnapshot';
import { IBrowserTab } from '../BrowserTypes';
import { DomEngine } from '../dom/DomEngine';
import { ElementResolver, ElementSearchCriteria } from './ElementResolver';
import { ClickStrategy } from './ClickStrategy';
import { InputStrategy } from './InputStrategy';
import { FormAutomation } from './FormAutomation';
import { ActionExecutor } from './ActionExecutor';

export interface AutomationContext {
  currentForm: DomFormInfo | null;
  focusedInput: DomElement | null;
  lastClickedElement: DomElement | null;
  lastFilledInput: DomElement | null;
}

export interface AutomationResult {
  success: boolean;
  action: string;
  targetElement?: DomElement;
  error?: string;
  verification?: {
    domChanged: boolean;
    navigated: boolean;
    currentUrl: string;
  };
}

export class AutomationEngine {
  private readonly resolver: ElementResolver;
  private readonly clickStrategy: ClickStrategy;
  private readonly inputStrategy: InputStrategy;
  private readonly formAutomation: FormAutomation;
  private readonly executor: ActionExecutor;

  private context: AutomationContext = {
    currentForm: null,
    focusedInput: null,
    lastClickedElement: null,
    lastFilledInput: null,
  };

  constructor(private readonly domEngine: DomEngine = new DomEngine()) {
    this.resolver = new ElementResolver();
    this.clickStrategy = new ClickStrategy(this.resolver);
    this.inputStrategy = new InputStrategy();
    this.formAutomation = new FormAutomation(this.inputStrategy, this.clickStrategy, this.resolver);
    this.executor = new ActionExecutor(this.clickStrategy, this.inputStrategy, this.resolver);
  }

  getContext(): AutomationContext {
    return { ...this.context };
  }

  resetContext(): void {
    this.context = {
      currentForm: null,
      focusedInput: null,
      lastClickedElement: null,
      lastFilledInput: null,
    };
  }

  getResolver(): ElementResolver {
    return this.resolver;
  }

  async click(
    tab: IBrowserTab,
    criteria: ElementSearchCriteria | string
  ): Promise<AutomationResult> {
    const beforeUrl = await tab.currentUrl();
    const snapshotBefore = await this.domEngine.readDom(tab);

    const match = this.resolver.resolve(snapshotBefore.elements, criteria);
    if (!match) {
      return {
        success: false,
        action: 'CLICK',
        error: `Element matching "${JSON.stringify(criteria)}" not found.`,
      };
    }

    const clickRes = await this.executor.click(tab, match);
    if (!clickRes.success) {
      return {
        success: false,
        action: 'CLICK',
        targetElement: match.element,
        error: clickRes.error,
      };
    }

    this.context.lastClickedElement = match.element;

    const afterUrl = await tab.currentUrl();
    const snapshotAfter = await this.domEngine.readDom(tab);

    const domChanged = snapshotAfter.elements.length !== snapshotBefore.elements.length;
    const navigated = afterUrl !== beforeUrl;

    return {
      success: true,
      action: 'CLICK',
      targetElement: match.element,
      verification: {
        domChanged,
        navigated,
        currentUrl: afterUrl,
      },
    };
  }

  async fill(
    tab: IBrowserTab,
    criteria: ElementSearchCriteria | string,
    value: string
  ): Promise<AutomationResult> {
    const snapshot = await this.domEngine.readDom(tab);
    const match = this.resolver.resolve(snapshot.elements, criteria);

    if (!match) {
      return {
        success: false,
        action: 'FILL',
        error: `Input element matching "${JSON.stringify(criteria)}" not found.`,
      };
    }

    const fillRes = await this.executor.fill(tab, match.element, value);
    if (!fillRes.success) {
      return {
        success: false,
        action: 'FILL',
        targetElement: match.element,
        error: fillRes.error,
      };
    }

    this.context.focusedInput = match.element;
    this.context.lastFilledInput = match.element;

    return {
      success: true,
      action: 'FILL',
      targetElement: match.element,
    };
  }

  async select(
    tab: IBrowserTab,
    criteria: ElementSearchCriteria | string,
    option: string
  ): Promise<AutomationResult> {
    const snapshot = await this.domEngine.readDom(tab);
    const match = this.resolver.resolve(snapshot.elements, criteria);

    if (!match) {
      return {
        success: false,
        action: 'SELECT',
        error: `Select element matching "${JSON.stringify(criteria)}" not found.`,
      };
    }

    const selectRes = await this.executor.select(tab, match.element, option);
    return {
      success: selectRes.success,
      action: 'SELECT',
      targetElement: match.element,
      error: selectRes.error,
    };
  }

  async check(
    tab: IBrowserTab,
    criteria: ElementSearchCriteria | string,
    checked = true
  ): Promise<AutomationResult> {
    const snapshot = await this.domEngine.readDom(tab);
    const match = this.resolver.resolve(snapshot.elements, criteria);

    if (!match) {
      return {
        success: false,
        action: 'CHECK',
        error: `Checkbox element matching "${JSON.stringify(criteria)}" not found.`,
      };
    }

    const checkRes = await this.executor.check(tab, match.element, checked);
    return {
      success: checkRes.success,
      action: 'CHECK',
      targetElement: match.element,
      error: checkRes.error,
    };
  }

  async submitForm(
    tab: IBrowserTab,
    formCriteria?: string
  ): Promise<AutomationResult> {
    const snapshot = await this.domEngine.readDom(tab);
    const form = this.formAutomation.findForm(snapshot.forms, formCriteria);
    this.context.currentForm = form;

    const res = await this.formAutomation.submitForm(tab, snapshot.elements, form);
    return {
      success: res.success,
      action: 'SUBMIT_FORM',
      error: res.error,
    };
  }
}
