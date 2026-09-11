import { ChatMessage } from '../types';

export class MessageBubble {
  constructor(private readonly message: ChatMessage) {}

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return hours + ':' + minutes;
  }

  escapeHtml(text: string): string {
    return text
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;')
      .split('\n').join('<br/>');
  }

  render(): string {
    const roleClass = 'kai-message-' + this.message.role;
    const authorLabel =
      this.message.role === 'user'
        ? 'You'
        : this.message.role === 'assistant'
          ? 'Kai'
          : 'System';
    const formattedTime = this.formatTimestamp(this.message.createdAt);
    const escapedContent = this.escapeHtml(this.message.content);

    return (
      '<div class="kai-message-row ' +
      roleClass +
      '" data-message-id="' +
      this.message.id +
      '">' +
      '<div class="kai-message-bubble">' +
      '<div class="kai-message-header">' +
      '<span class="kai-message-author">' +
      authorLabel +
      '</span>' +
      '<span class="kai-message-time">' +
      formattedTime +
      '</span>' +
      '</div>' +
      '<div class="kai-message-content">' +
      escapedContent +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }
}
