import { Window, WindowInfo } from './Window';
import { IWindowProvider } from '../native/WindowProvider';

/**
 * WindowManager is responsible for querying and filtering
 * the top-level windows visible on the system.
 *
 * It delegates actual enumeration to an IWindowProvider so
 * platform-specific code stays isolated and the manager remains testable.
 */
export class WindowManager {
  private windows: Window[] = [];
  private initialized = false;

  constructor(private readonly provider: IWindowProvider) {}

  /**
   * Re-enumerates all windows from the provider.
   */
  async refresh(): Promise<void> {
    const infos = await this.provider.enumerate();
    this.windows = infos.map((info) => new Window(info));
    this.initialized = true;
  }

  /**
   * Returns all known windows.
   * Auto-refreshes on first access.
   */
  async getWindows(): Promise<ReadonlyArray<Window>> {
    if (!this.initialized) {
      await this.refresh();
    }
    return this.windows;
  }

  /**
   * Returns the current foreground window, or undefined if none.
   */
  async getForegroundWindow(): Promise<Window | undefined> {
    const all = await this.getWindows();
    return all.find((w) => w.isForeground);
  }

  /**
   * Returns the currently active window from the provider, or null if none.
   */
  async getActiveWindow(): Promise<WindowInfo | null> {
    return this.provider.getActiveWindow();
  }

  /**
   * Returns the window matching the given id, or undefined.
   */
  async findWindowById(id: string): Promise<Window | undefined> {
    const all = await this.getWindows();
    return all.find((w) => w.id === id);
  }

  /**
   * Returns all windows belonging to the given process name.
   */
  async findWindowsByProcess(processName: string): Promise<ReadonlyArray<Window>> {
    const all = await this.getWindows();
    return all.filter((w) => w.processName === processName);
  }

  /**
   * Returns only visible (non-hidden) windows.
   */
  async getVisibleWindows(): Promise<ReadonlyArray<Window>> {
    const all = await this.getWindows();
    return all.filter((w) => w.isVisible);
  }

  /**
   * Returns true if refresh() has been called at least once.
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
