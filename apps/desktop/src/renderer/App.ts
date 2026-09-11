export interface RendererDomElements {
  title: string;
  status: string;
}

export class RendererApp {
  private titleText: string = 'Kai Desktop';
  private statusText: string = 'Loading...';

  getElements(): RendererDomElements {
    return {
      title: this.titleText,
      status: this.statusText,
    };
  }

  mount(rootElement?: any): void {
    if (rootElement) {
      rootElement.innerHTML =
        '<div class="container"><h1 class="title">' +
        this.titleText +
        '</h1><p class="status">' +
        this.statusText +
        '</p></div>';
    }
  }
}