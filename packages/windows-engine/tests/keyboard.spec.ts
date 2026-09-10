import { describe, it, expect, beforeEach } from 'vitest';
import {
  InputProvider,
  Key,
  KeyboardController,
} from '../src';

export class MockInputProvider implements InputProvider {
  public pressedKeys: Key[] = [];
  public releasedKeys: Key[] = [];
  public tappedKeys: Key[] = [];
  public typedTexts: string[] = [];

  async pressKey(key: Key): Promise<void> {
    this.pressedKeys.push(key);
  }

  async releaseKey(key: Key): Promise<void> {
    this.releasedKeys.push(key);
  }

  async tapKey(key: Key): Promise<void> {
    this.tappedKeys.push(key);
  }

  async typeText(text: string): Promise<void> {
    this.typedTexts.push(text);
  }
}

describe('KeyboardController', () => {
  let mockProvider: MockInputProvider;
  let controller: KeyboardController;

  beforeEach(() => {
    mockProvider = new MockInputProvider();
    controller = new KeyboardController(mockProvider);
  });

  it('pressKey', async () => {
    await controller.pressKey(Key.Control);
    await controller.pressKey(Key.A);

    expect(mockProvider.pressedKeys).toEqual([Key.Control, Key.A]);
  });

  it('releaseKey', async () => {
    await controller.releaseKey(Key.Control);
    await controller.releaseKey(Key.Shift);

    expect(mockProvider.releasedKeys).toEqual([Key.Control, Key.Shift]);
  });

  it('tapKey', async () => {
    await controller.tapKey(Key.Enter);
    await controller.tapKey(Key.Escape);
    await controller.tapKey(Key.Tab);
    await controller.tapKey(Key.Space);
    await controller.tapKey(Key.Backspace);
    await controller.tapKey(Key.Delete);
    await controller.tapKey(Key.ArrowUp);
    await controller.tapKey(Key.ArrowDown);
    await controller.tapKey(Key.ArrowLeft);
    await controller.tapKey(Key.ArrowRight);
    await controller.tapKey(Key.Alt);
    await controller.tapKey(Key.Meta);
    await controller.tapKey(Key.Digit0);

    expect(mockProvider.tappedKeys).toHaveLength(13);
    expect(mockProvider.tappedKeys[0]).toBe(Key.Enter);
    expect(mockProvider.tappedKeys[12]).toBe(Key.Digit0);
  });

  it('typeText', async () => {
    await controller.typeText('Hello Kai!');

    expect(mockProvider.typedTexts).toEqual(['Hello Kai!']);
  });

  it('provider abstraction', async () => {
    let customTyped = '';
    class CustomInputProvider implements InputProvider {
      async pressKey(): Promise<void> {}
      async releaseKey(): Promise<void> {}
      async tapKey(): Promise<void> {}
      async typeText(text: string): Promise<void> {
        customTyped = text;
      }
    }

    const customController = new KeyboardController(new CustomInputProvider());
    await customController.typeText('Custom Provider Text');

    expect(customTyped).toBe('Custom Provider Text');
  });
});
