import { Key } from './Key';
import { InputProvider } from './InputProvider';

export class KeyboardController {
  constructor(private readonly provider: InputProvider) {}

  async pressKey(key: Key | string): Promise<void> {
    const keyEnum = this.resolveKey(key);
    return this.provider.pressKey(keyEnum);
  }

  async releaseKey(key: Key | string): Promise<void> {
    const keyEnum = this.resolveKey(key);
    return this.provider.releaseKey(keyEnum);
  }

  async tapKey(key: Key | string): Promise<void> {
    const keyEnum = this.resolveKey(key);
    return this.provider.tapKey(keyEnum);
  }

  async typeText(text: string): Promise<void> {
    return this.provider.typeText(text);
  }

  async copy(): Promise<void> {
    await this.executeShortcut('Ctrl+C');
  }

  async paste(): Promise<void> {
    await this.executeShortcut('Ctrl+V');
  }

  async selectAll(): Promise<void> {
    await this.executeShortcut('Ctrl+A');
  }

  async executeShortcut(shortcut: string): Promise<void> {
    const parts = shortcut.split('+').map((s) => s.trim().toLowerCase());
    const modifiers: Key[] = [];
    let mainKey: Key | undefined;

    for (const part of parts) {
      if (part === 'ctrl' || part === 'control') {
        modifiers.push(Key.Control);
      } else if (part === 'shift') {
        modifiers.push(Key.Shift);
      } else if (part === 'alt') {
        modifiers.push(Key.Alt);
      } else if (part === 'win' || part === 'meta') {
        modifiers.push(Key.Win);
      } else {
        mainKey = this.resolveKey(part);
      }
    }

    if (modifiers.length > 0 && mainKey) {
      for (const m of modifiers) {
        await this.provider.pressKey(m);
      }
      await this.provider.tapKey(mainKey);
      for (const m of [...modifiers].reverse()) {
        await this.provider.releaseKey(m);
      }
    } else {
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

  private resolveKey(key: Key | string): Key {
    if (Object.values(Key).includes(key as Key)) {
      return key as Key;
    }
    const upper = key.toUpperCase();
    if ((Key as any)[upper]) {
      return (Key as any)[upper];
    }
    const matched = Object.values(Key).find(
      (k) => k.toLowerCase() === key.toLowerCase()
    );
    return matched ?? Key.Enter;
  }
}

