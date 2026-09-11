import { ChatWindow } from './components/ChatWindow';

export interface RendererDomElements {
  title: string;
  status: string;
}

export class RendererApp {
  private titleText: string = 'Kai Desktop';
  private statusText: string = 'Loading...';
  private chatWindow: ChatWindow;

  constructor() {
    this.chatWindow = new ChatWindow();
  }

  getChatWindow(): ChatWindow {
    return this.chatWindow;
  }

  getElements(): RendererDomElements {
    return {
      title: this.titleText,
      status: this.statusText,
    };
  }

  mount(rootElement?: any): void {
    if (rootElement) {
      rootElement.innerHTML = this.chatWindow.render();
    }
  }
}