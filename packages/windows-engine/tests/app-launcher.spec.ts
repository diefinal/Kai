import { describe, it, expect, vi } from 'vitest';
import { AppLauncher, KeyboardController, Key, InputProvider } from '../src';

describe('AppLauncher', () => {
  it('resolves known applications by name or aliases', () => {
    const launcher = new AppLauncher();
    expect(launcher.resolveApp('chrome')?.name).toBe('Google Chrome');
    expect(launcher.resolveApp('Google Chrome')?.name).toBe('Google Chrome');
    expect(launcher.resolveApp('vscode')?.name).toBe('Visual Studio Code');
    expect(launcher.resolveApp('VS Code')?.name).toBe('Visual Studio Code');
    expect(launcher.resolveApp('notepad')?.name).toBe('Notepad');
    expect(launcher.resolveApp('not defteri')?.name).toBe('Notepad');
    expect(launcher.resolveApp('explorer')?.name).toBe('File Explorer');
    expect(launcher.resolveApp('dosya gezgini')?.name).toBe('File Explorer');
    expect(launcher.resolveApp('edge')?.name).toBe('Microsoft Edge');
  });

  it('activates existing window if application is already open', async () => {
    const mockWindowProvider = {
      enumerate: vi.fn().mockResolvedValue([
        { id: 'hwnd-chrome', title: 'Google Chrome', processName: 'chrome.exe' },
      ]),
      getActiveWindow: vi.fn().mockResolvedValue(null),
      activateWindow: vi.fn().mockResolvedValue(true),
    };

    const launcher = new AppLauncher(mockWindowProvider);
    const result = await launcher.launch('chrome');

    expect(result.success).toBe(true);
    expect(result.alreadyOpen).toBe(true);
    expect(mockWindowProvider.activateWindow).toHaveBeenCalledWith('hwnd-chrome');
  });

  it('returns error if application is not supported', async () => {
    const launcher = new AppLauncher();
    const result = await launcher.launch('unknown-game-app');

    expect(result.success).toBe(false);
    expect(result.error).toContain('is not recognized or supported');
  });
});

describe('KeyboardController Shortcuts', () => {
  it('executes Ctrl+C, Ctrl+V, and Ctrl+A shortcuts', async () => {
    const mockInputProvider: InputProvider = {
      pressKey: vi.fn().mockResolvedValue(undefined),
      releaseKey: vi.fn().mockResolvedValue(undefined),
      tapKey: vi.fn().mockResolvedValue(undefined),
      typeText: vi.fn().mockResolvedValue(undefined),
    };

    const keyboard = new KeyboardController(mockInputProvider);

    await keyboard.executeShortcut('Ctrl+C');
    expect(mockInputProvider.pressKey).toHaveBeenCalledWith(Key.Control);
    expect(mockInputProvider.tapKey).toHaveBeenCalledWith(Key.C);
    expect(mockInputProvider.releaseKey).toHaveBeenCalledWith(Key.Control);

    await keyboard.executeShortcut('Ctrl+V');
    expect(mockInputProvider.tapKey).toHaveBeenCalledWith(Key.V);

    await keyboard.executeShortcut('Ctrl+A');
    expect(mockInputProvider.tapKey).toHaveBeenCalledWith(Key.A);
  });
});
