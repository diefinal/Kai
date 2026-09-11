import { WindowInfo } from '../window/Window';

export interface MousePosition {
  x: number;
  y: number;
}

export interface ScreenCapture {
  width: number;
  height: number;
  timestamp: number;
  image: Uint8Array;
}

export interface NativeProvider {
  getWindows(): Promise<WindowInfo[]>;
  getActiveWindow(): Promise<WindowInfo | null>;
  getMousePosition(): Promise<MousePosition>;
  captureScreen(): Promise<ScreenCapture>;
  readClipboard(): Promise<string>;
  writeClipboard(text: string): Promise<void>;
}
