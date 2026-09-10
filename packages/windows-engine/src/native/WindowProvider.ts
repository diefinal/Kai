import { WindowInfo } from '../window/Window';

/**
 * Provider interface for window enumeration.
 * Concrete implementations call platform-specific APIs (Win32 EnumWindows, etc.).
 * Abstracted behind this interface for testability and portability.
 */
export interface IWindowProvider {
  /** Return all top-level windows currently known to the OS. */
  enumerate(): Promise<WindowInfo[]>;
}
