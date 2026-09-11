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
}
