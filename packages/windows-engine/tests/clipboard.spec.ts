import { describe, it, expect, beforeEach } from 'vitest';
import {
  ClipboardManager,
  ClipboardProvider,
} from '../src';

export class MockClipboardProvider implements ClipboardProvider {
  private content = '';

  async readText(): Promise<string> {
    return this.content;
  }

  async writeText(text: string): Promise<void> {
    this.content = text;
  }

  async clear(): Promise<void> {
    this.content = '';
  }
}

describe('ClipboardManager', () => {
  let mockProvider: MockClipboardProvider;
  let manager: ClipboardManager;

  beforeEach(() => {
    mockProvider = new MockClipboardProvider();
    manager = new ClipboardManager(mockProvider);
  });

  it('readText', async () => {
    await mockProvider.writeText('Sample text');
    const text = await manager.readText();

    expect(text).toBe('Sample text');
  });

  it('writeText', async () => {
    await manager.writeText('Kai clipboard text');
    const text = await manager.readText();

    expect(text).toBe('Kai clipboard text');
  });

  it('clear', async () => {
    await manager.writeText('To be cleared');
    expect(await manager.readText()).toBe('To be cleared');

    await manager.clear();
    expect(await manager.readText()).toBe('');
  });

  it('provider abstraction', async () => {
    let customCleared = false;
    class CustomClipboardProvider implements ClipboardProvider {
      private text = 'custom';
      async readText(): Promise<string> {
        return this.text;
      }
      async writeText(text: string): Promise<void> {
        this.text = text;
      }
      async clear(): Promise<void> {
        customCleared = true;
        this.text = '';
      }
    }

    const customManager = new ClipboardManager(new CustomClipboardProvider());
    expect(await customManager.readText()).toBe('custom');
    await customManager.writeText('custom 2');
    expect(await customManager.readText()).toBe('custom 2');
    await customManager.clear();
    expect(customCleared).toBe(true);
    expect(await customManager.readText()).toBe('');
  });
});
