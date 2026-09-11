import { WindowInfo } from '../window/Window';

/**
 * Provider interface for window enumeration.
 * Concrete implementations call platform-specific APIs (Win32 EnumWindows, etc.).
 * Abstracted behind this interface for testability and portability.
 */
export interface IWindowProvider {
  /** Return all top-level windows currently known to the OS. */
  enumerate(): Promise<WindowInfo[]>;
  /** Return the currently active (foreground) window, or null if none. */
  getActiveWindow(): Promise<WindowInfo | null>;
  /** Bring window to foreground / activate it. */
  activateWindow?(id: string): Promise<boolean>;
  /** Minimize window (or active window if no id provided). */
  minimizeWindow?(id?: string): Promise<boolean>;
  /** Maximize window (or active window if no id provided). */
  maximizeWindow?(id?: string): Promise<boolean>;
  /** Close window (or active window if no id provided). */
  closeWindow?(id?: string): Promise<boolean>;
}
