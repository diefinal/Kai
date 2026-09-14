import { Win32Provider } from './native/Win32Provider';
import { AppLauncher } from './app/AppLauncher';
import { MouseController } from './input/MouseController';
import { KeyboardController } from './input/KeyboardController';

/**
 * Creates a complete set of production Windows dependencies
 * using the real Win32Provider for OS-level operations.
 *
 * Used by the Desktop app to inject real implementations
 * instead of mock stubs.
 */
export function createProductionWindowsDependencies() {
  const win32Provider = new Win32Provider();
  return {
    windowsProvider: win32Provider,
    appLauncher: new AppLauncher(win32Provider),
    mouseController: new MouseController(win32Provider),
    keyboardController: new KeyboardController(win32Provider),
  };
}
