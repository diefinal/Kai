import { MousePosition } from '../native/NativeProvider';

export interface IMouseProvider {
  getPosition(): Promise<MousePosition>;
  move(x: number, y: number): Promise<void>;
  leftClick(): Promise<void>;
  rightClick(): Promise<void>;
  doubleClick(): Promise<void>;
  click?(button?: 'left' | 'right' | 'middle'): Promise<void>;
}
