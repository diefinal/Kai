import { Display, DisplayInfo } from './Display';

/**
 * Provider interface for display enumeration.
 * Concrete implementations call platform-specific APIs (Win32, etc.).
 * Abstracted behind this interface for testability.
 */
export interface IDisplayProvider {
  enumerate(): Promise<DisplayInfo[]>;
}

/**
 * DisplayManager is responsible for enumerating, caching, and querying
 * the displays connected to the system.
 *
 * It delegates actual enumeration to an IDisplayProvider so the
 * platform-specific code stays isolated and the manager remains testable.
 */
export class DisplayManager {
  private displays: Display[] = [];
  private initialized = false;

  constructor(private readonly provider: IDisplayProvider) {}

  /**
   * Enumerates all connected displays via the provider and caches the result.
   * Must be called before querying.
   */
  async refresh(): Promise<void> {
    const infos = await this.provider.enumerate();
    this.displays = infos.map((info) => new Display(info));
    this.initialized = true;
  }

  /**
   * Returns all currently known displays.
   * Calls refresh() automatically on first access.
   */
  async getAll(): Promise<ReadonlyArray<Display>> {
    if (!this.initialized) {
      await this.refresh();
    }
    return this.displays;
  }

  /**
   * Returns the primary display, or undefined if none is marked primary.
   */
  async getPrimary(): Promise<Display | undefined> {
    const all = await this.getAll();
    return all.find((d) => d.primary);
  }

  /**
   * Returns the display matching the given id, or undefined.
   */
  async getById(id: string): Promise<Display | undefined> {
    const all = await this.getAll();
    return all.find((d) => d.id === id);
  }

  /**
   * Returns the total number of connected displays.
   */
  async count(): Promise<number> {
    const all = await this.getAll();
    return all.length;
  }

  /**
   * Returns true if refresh() has been called at least once.
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
