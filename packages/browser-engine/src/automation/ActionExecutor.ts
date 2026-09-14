import { DomElement } from '../dom/DomElement';
import { IBrowserTab } from '../BrowserTypes';
import { ClickStrategy, ClickResult } from './ClickStrategy';
import { InputStrategy, FillResult, SelectResult, CheckResult } from './InputStrategy';
import { ElementResolver, ResolvedElementMatch } from './ElementResolver';

export class ActionExecutor {
  constructor(
    private readonly clickStrategy: ClickStrategy = new ClickStrategy(),
    private readonly inputStrategy: InputStrategy = new InputStrategy(),
    private readonly resolver: ElementResolver = new ElementResolver()
  ) {}

  async click(
    tab: IBrowserTab,
    match: ResolvedElementMatch
  ): Promise<ClickResult> {
    return this.clickStrategy.executeClick(tab, match);
  }

  async fill(
    tab: IBrowserTab,
    element: DomElement,
    value: string
  ): Promise<FillResult> {
    return this.inputStrategy.fill(tab, element, value);
  }

  async select(
    tab: IBrowserTab,
    element: DomElement,
    option: string
  ): Promise<SelectResult> {
    return this.inputStrategy.select(tab, element, option);
  }

  async check(
    tab: IBrowserTab,
    element: DomElement,
    checked = true
  ): Promise<CheckResult> {
    return this.inputStrategy.check(tab, element, checked);
  }
}
