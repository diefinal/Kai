export interface MousePosition {
  x: number;
  y: number;
}

export interface MouseProvider {
  getPosition(): Promise<MousePosition>;
  move(x: number, y: number): Promise<void>;
  click(button: 'left' | 'right' | 'middle'): Promise<void>;
  doubleClick(button: 'left' | 'right' | 'middle'): Promise<void>;
}
