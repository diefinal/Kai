import { describe, it, expect, beforeEach } from 'vitest';
import {
  MouseController,
  MousePosition,
  MouseProvider,
} from '../src';

class MockMouseProvider implements MouseProvider {
  public position: MousePosition = { x: 0, y: 0 };
  public lastClickButton: 'left' | 'right' | 'middle' | null = null;
  public lastDoubleClickButton: 'left' | 'right' | 'middle' | null = null;
  public clickCount = 0;
  public doubleClickCount = 0;

  async getPosition(): Promise<MousePosition> {
    return { ...this.position };
  }

  async move(x: number, y: number): Promise<void> {
    this.position = { x, y };
  }

  async click(button: 'left' | 'right' | 'middle'): Promise<void> {
    this.lastClickButton = button;
    this.clickCount++;
  }

  async doubleClick(button: 'left' | 'right' | 'middle'): Promise<void> {
    this.lastDoubleClickButton = button;
    this.doubleClickCount++;
  }
}

describe('MouseController', () => {
  let mockProvider: MockMouseProvider;
  let controller: MouseController;

  beforeEach(() => {
    mockProvider = new MockMouseProvider();
    controller = new MouseController(mockProvider);
  });

  it('getPosition', async () => {
    mockProvider.position = { x: 150, y: 300 };
    const pos = await controller.getPosition();

    expect(pos).toEqual({ x: 150, y: 300 });
  });

  it('move', async () => {
    await controller.move(400, 500);

    expect(mockProvider.position).toEqual({ x: 400, y: 500 });
    const pos = await controller.getPosition();
    expect(pos).toEqual({ x: 400, y: 500 });
  });

  it('click', async () => {
    await controller.click('left');
    expect(mockProvider.lastClickButton).toBe('left');
    expect(mockProvider.clickCount).toBe(1);

    await controller.click('right');
    expect(mockProvider.lastClickButton).toBe('right');
    expect(mockProvider.clickCount).toBe(2);

    await controller.click('middle');
    expect(mockProvider.lastClickButton).toBe('middle');
    expect(mockProvider.clickCount).toBe(3);
  });

  it('doubleClick', async () => {
    await controller.doubleClick('left');
    expect(mockProvider.lastDoubleClickButton).toBe('left');
    expect(mockProvider.doubleClickCount).toBe(1);

    await controller.doubleClick('right');
    expect(mockProvider.lastDoubleClickButton).toBe('right');
    expect(mockProvider.doubleClickCount).toBe(2);
  });

  it('provider abstraction', async () => {
    class CustomProvider implements MouseProvider {
      async getPosition(): Promise<MousePosition> {
        return { x: 999, y: 888 };
      }
      async move(): Promise<void> {}
      async click(): Promise<void> {}
      async doubleClick(): Promise<void> {}
    }

    const customController = new MouseController(new CustomProvider());
    const pos = await customController.getPosition();
    expect(pos).toEqual({ x: 999, y: 888 });
  });
});
