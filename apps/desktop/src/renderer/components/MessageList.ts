import { ChatMessage } from '../types';
import { MessageBubble } from './MessageBubble';

export class MessageList {
  private messages: ChatMessage[] = [];
  private containerElement: any = null;

  constructor(initialMessages: ChatMessage[] = []) {
    this.messages = [...initialMessages];
  }

  setMessages(messages: ChatMessage[]): void {
    this.messages = [...messages];
    this.update();
  }

  addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.update();
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  bindContainer(container: any): void {
    this.containerElement = container;
    this.update();
  }

  scrollToBottom(): void {
    if (this.containerElement) {
      this.containerElement.scrollTop = this.containerElement.scrollHeight;
    }
  }

  render(): string {
    const bubblesHtml = this.messages
      .map((msg) => new MessageBubble(msg).render())
      .join('');

    return (
      '<main class="kai-message-list" id="kai-message-list">' +
      bubblesHtml +
      '</main>'
    );
  }

  update(): void {
    if (this.containerElement) {
      this.containerElement.innerHTML = this.render();
      this.scrollToBottom();
    }
  }
}
 
