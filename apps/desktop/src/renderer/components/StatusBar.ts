export class StatusBar {
  private title: string = 'Kai';
  private statusText: string = '';

  constructor(title: string = 'Kai') {
    this.title = title;
  }

  setStatus(status: string): void {
    this.statusText = status;
  }

  getTitle(): string {
    return this.title;
  }

  getStatus(): string {
    return this.statusText;
  }

  render(): string {
    const statusHtml = this.statusText
      ? '<span class= kai-status-badge>' + this.statusText + '</span>'
      : '';

    return (
      '<header class=kai-status-bar>' +
      '<div class=kai-status-title>' +
      this.title +
      '</div>' +
      '<div class=kai-status-indicator>' +
      statusHtml +
      '</div>' +
      '</header>'
    );
  }
}