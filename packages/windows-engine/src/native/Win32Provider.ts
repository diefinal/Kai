import { NativeProvider, MousePosition, ScreenCapture } from './NativeProvider';
import { WindowInfo } from '../window/Window';

export class Win32Provider implements NativeProvider {
  async getWindows(): Promise<WindowInfo[]> {
    throw new Error('Not implemented');
  }

  async getActiveWindow(): Promise<WindowInfo | null> {
    throw new Error('Not implemented');
  }

  async getMousePosition(): Promise<MousePosition> {
    throw new Error('Not implemented');
  }

  async captureScreen(): Promise<ScreenCapture> {
    throw new Error('Not implemented');
  }

  async readClipboard(): Promise<string> {
    throw new Error('Not implemented');
  }

  async writeClipboard(_text: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
