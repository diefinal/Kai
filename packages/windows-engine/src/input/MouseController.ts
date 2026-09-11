import { MousePosition } from '../native/NativeProvider';
import { IMouseProvider } from './MouseProvider';

export class MouseController {
  constructor(private readonly provider: IMouseProvider) {}

  async getPosition(): Promise<MousePosition> {
    return this.provider.getPosition();
  }

  async move(x: number, y: number): Promise<void> {
    return this.provider.move(x, y);
  }

  async leftClick(): Promise<void> {
    return this.provider.leftClick();
  }

  async rightClick(): Promise<void> {
    return this.provider.rightClick();
  }

  async doubleClick(): Promise<void> {
    return this.provider.doubleClick();
  }

  async click(button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    if (this.provider.click) {
      return this.provider.click(button);
    }
    if (button === 'right') {
      return this.provider.rightClick();
    }
    return this.provider.leftClick();
  }
}
