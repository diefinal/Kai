import { ChatMessage } from '../types';
import { StatusBar } from './StatusBar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export interface ChatWindowOptions {
  initialGreeting?: string;
  onCommand?: (content: string) => Promise<string> | string;
}

export class ChatWindow {
  private readonly statusBar: StatusBar;
  private readonly messageList: MessageList;
  private readonly messageInput: MessageInput;
  private isLoading: boolean = false;
  private idCounter: number = 1;

  constructor(private readonly options: ChatWindowOptions = {}) {
    this.statusBar = new StatusBar('Kai');
    const greeting = options.initialGreeting ?? 'Welcome to Kai';
    const initialMessage: ChatMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: greeting,
      createdAt: Date.now(),
    };

    this.messageList = new MessageList([initialMessage]);
    this.messageInput = new MessageInput({
      onSend: (text) => this.handleSendMessage(text),
    });
  }

  private generateId(): string {
    return 'msg-' + (this.idCounter++) + '-' + Date.now();
  }

  getStatusBar(): StatusBar {
    return this.statusBar;
  }

  getMessageList(): MessageList {
    return this.messageList;
  }

  getMessageInput(): MessageInput {
    return this.messageInput;
  }

  getLoading(): boolean {
    return this.isLoading;
  }

  async handleSendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || this.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };
    this.messageList.addMessage(userMessage);

    this.isLoading = true;
    this.statusBar.setStatus('Thinking...');
    this.messageInput.setDisabled(true);

    const thinkingId = this.generateId();
    const thinkingMessage: ChatMessage = {
      id: thinkingId,
      role: 'assistant',
      content: 'Thinking...',
      createdAt: Date.now(),
    };
    this.messageList.addMessage(thinkingMessage);

    try {
      let responseText = 'Command received.';
      if (this.options.onCommand) {
        responseText = await this.options.onCommand(trimmed);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Replace temporary thinking message with response
      const currentMessages = this.messageList.getMessages();
      const updatedMessages = currentMessages.map((msg) => {
        if (msg.id === thinkingId) {
          return {
            ...msg,
            content: responseText,
            createdAt: Date.now(),
          };
        }
        return msg;
      });

      this.messageList.setMessages(updatedMessages);
    } finally {
      this.isLoading = false;
      this.statusBar.setStatus('');
      this.messageInput.setDisabled(false);
    }
  }

  render(): string {
    return (
      '<div class="kai-chat-window">' +
      this.statusBar.render() +
      this.messageList.render() +
      this.messageInput.render() +
      '</div>'
    );
  }
}
 
