export interface MessageInputOptions {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export class MessageInput {
  private inputElement: any = null;
  private disabled: boolean = false;

  constructor(private readonly options: MessageInputOptions) {
    this.disabled = Boolean(options.disabled);
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    if (this.inputElement) {
      this.inputElement.disabled = disabled;
    }
  }

  isDisabled(): boolean {
    return this.disabled;
  }

  submit(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed || this.disabled) {
      return false;
    }
    this.options.onSend(trimmed);
    return true;
  }

  handleKeyDown(event: { key: string; shiftKey: boolean; preventDefault: () => void }, text: string): boolean {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      return this.submit(text);
    }
    return false;
  }

  render(): string {
    return (
      '<footer class="kai-message-input-bar">' +
      '<span class="kai-prompt-indicator">&gt;</span>' +
      '<input type="text" class="kai-input" id="kai-input" placeholder="Type a message..." ' +
      (this.disabled ? 'disabled ' : '') +
      '/>' +
      '<button class="kai-send-button" id="kai-send-btn" ' +
      (this.disabled ? 'disabled' : '') +
      '>▶</button>' +
      '</footer>'
    );
  }
}
 
