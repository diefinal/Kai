import { Key } from './Key';
import { InputProvider } from './InputProvider';

export class KeyboardController {
  constructor(private readonly provider: InputProvider) {}

  async pressKey(key: Key): Promise<void> {
    return this.provider.pressKey(key);
  }

  async releaseKey(key: Key): Promise<void> {
    return this.provider.releaseKey(key);
  }

  async tapKey(key: Key): Promise<void> {
    return this.provider.tapKey(key);
  }

  async typeText(text: string): Promise<void> {
    return this.provider.typeText(text);
  }

  async executeShortcut(shortcut: string): Promise<void> {
    const norm = shortcut.toLowerCase().replace(/[\s\-_+]/g, '');
    if (norm === 'ctrlc' || norm === 'controlc') {
      await this.provider.pressKey(Key.Control);
      await this.provider.tapKey(Key.C);
      await this.provider.releaseKey(Key.Control);
    } else if (norm === 'ctrlv' || norm === 'controlv') {
      await this.provider.pressKey(Key.Control);
      await this.provider.tapKey(Key.V);
      await this.provider.releaseKey(Key.Control);
    } else if (norm === 'ctrla' || norm === 'controla') {
      await this.provider.pressKey(Key.Control);
      await this.provider.tapKey(Key.A);
      await this.provider.releaseKey(Key.Control);
    }
  }
}
