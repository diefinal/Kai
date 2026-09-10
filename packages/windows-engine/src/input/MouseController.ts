import { MousePosition, MouseProvider } from './MouseProvider';

export class MouseController {
  constructor(private readonly provider: MouseProvider) {}

  async getPosition(): Promise<MousePosition> {
    return this.provider.getPosition();
  }

  async move(x: number, y: number): Promise<void> {
    return this.provider.move(x, y);
  }

  async click(button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    return this.provider.click(button);
  }

  async doubleClick(button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    return this.provider.doubleClick(button);
  }
}
