import { ClipboardProvider } from './ClipboardProvider';

export class ClipboardManager {
  constructor(private readonly provider: ClipboardProvider) {}

  async readText(): Promise<string> {
    return this.provider.readText();
  }

  async writeText(text: string): Promise<void> {
    return this.provider.writeText(text);
  }

  async clear(): Promise<void> {
    return this.provider.clear();
  }
}
