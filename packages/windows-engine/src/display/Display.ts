/**
 * Represents the bounding rectangle of a display in virtual screen coordinates.
 */
export interface DisplayBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Represents a single physical display connected to the system.
 * Immutable after construction.
 */
export interface DisplayInfo {
  readonly id: string;
  readonly name: string;
  readonly primary: boolean;
  readonly width: number;
  readonly height: number;
  readonly dpi: number;
  readonly scaleFactor: number;
  readonly refreshRate: number;
  readonly bounds: DisplayBounds;
}

/**
 * Concrete immutable Display value object.
 */
export class Display implements DisplayInfo {
  readonly id: string;
  readonly name: string;
  readonly primary: boolean;
  readonly width: number;
  readonly height: number;
  readonly dpi: number;
  readonly scaleFactor: number;
  readonly refreshRate: number;
  readonly bounds: DisplayBounds;

  constructor(info: DisplayInfo) {
    this.id = info.id;
    this.name = info.name;
    this.primary = info.primary;
    this.width = info.width;
    this.height = info.height;
    this.dpi = info.dpi;
    this.scaleFactor = info.scaleFactor;
    this.refreshRate = info.refreshRate;
    this.bounds = Object.freeze({ ...info.bounds });
  }
}
