/**
 * Represents the bounding rectangle of a window in screen coordinates.
 */
export interface WindowBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Describes a single OS-level window.
 * Immutable after construction.
 */
export interface WindowInfo {
  readonly id: string;
  readonly title: string;
  readonly processId: number;
  readonly processName: string;
  readonly bounds: WindowBounds;
  readonly isVisible: boolean;
  readonly isMinimized: boolean;
  readonly isForeground: boolean;
  readonly displayId: string;
}

/**
 * Concrete immutable Window value object.
 */
export class Window implements WindowInfo {
  readonly id: string;
  readonly title: string;
  readonly processId: number;
  readonly processName: string;
  readonly bounds: WindowBounds;
  readonly isVisible: boolean;
  readonly isMinimized: boolean;
  readonly isForeground: boolean;
  readonly displayId: string;

  constructor(info: WindowInfo) {
    this.id = info.id;
    this.title = info.title;
    this.processId = info.processId;
    this.processName = info.processName;
    this.bounds = Object.freeze({ ...info.bounds });
    this.isVisible = info.isVisible;
    this.isMinimized = info.isMinimized;
    this.isForeground = info.isForeground;
    this.displayId = info.displayId;
  }
}
