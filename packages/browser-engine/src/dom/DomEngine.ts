import { DomElement } from './DomElement';
import { DomFormInfo, DomSnapshot, DomTableInfo } from './DomSnapshot';
import { DomQuery, DomQueryCriteria } from './DomQuery';
import { DomReader } from './DomReader';
import { IBrowserTab, IPlaywrightPageHandle } from '../BrowserTypes';

export class DomEngine {
  constructor(private readonly reader: DomReader = new DomReader()) {}

  getReader(): DomReader {
    return this.reader;
  }

  private getPageHandle(tab: IBrowserTab): IPlaywrightPageHandle {
    // Check if tab exposes pageHandle via getter or property
    if ('getPageHandle' in tab && typeof (tab as any).getPageHandle === 'function') {
      return (tab as any).getPageHandle();
    }
    if ('pageHandle' in tab) {
      return (tab as any).pageHandle;
    }
    // Fallback minimal handle using tab methods
    return {
      id: tab.id,
      url: () => '',
      title: () => tab.title(),
      goto: (url: string) => tab.navigate(url),
      reload: () => tab.reload(),
      goBack: () => tab.back(),
      goForward: () => tab.forward(),
      close: () => tab.close(),
    };
  }

  async readDom(tab: IBrowserTab): Promise<DomSnapshot> {
    const handle = this.getPageHandle(tab);
    return this.reader.readFromPage(handle);
  }

  async captureSnapshot(tab: IBrowserTab): Promise<DomSnapshot> {
    return this.readDom(tab);
  }

  async queryDom(tab: IBrowserTab, criteria: DomQueryCriteria): Promise<DomElement[]> {
    const snapshot = await this.readDom(tab);
    return DomQuery.query(snapshot.elements, criteria);
  }

  async findElement(tab: IBrowserTab, criteria: DomQueryCriteria): Promise<DomElement | null> {
    const snapshot = await this.readDom(tab);
    return DomQuery.findOne(snapshot.elements, criteria);
  }

  async getForms(tab: IBrowserTab): Promise<DomFormInfo[]> {
    const snapshot = await this.readDom(tab);
    return snapshot.forms;
  }

  async getButtons(tab: IBrowserTab): Promise<DomElement[]> {
    const snapshot = await this.readDom(tab);
    return snapshot.buttons;
  }

  async getInputs(tab: IBrowserTab): Promise<DomElement[]> {
    const snapshot = await this.readDom(tab);
    return snapshot.inputs;
  }

  async getLinks(tab: IBrowserTab): Promise<DomElement[]> {
    const snapshot = await this.readDom(tab);
    return snapshot.links;
  }

  async getTables(tab: IBrowserTab): Promise<DomTableInfo[]> {
    const snapshot = await this.readDom(tab);
    return snapshot.tables;
  }

  async getVisibleText(tab: IBrowserTab): Promise<string> {
    const snapshot = await this.readDom(tab);
    return snapshot.visibleText;
  }
}
