import { describe, it, expect, vi } from 'vitest';
import { CommandDispatcher } from '../src/core/CommandDispatcher';
import { CommandRegistry } from '../src/core/CommandRegistry';

describe('E2E Command Execution in Desktop Core', () => {
  const registry = new CommandRegistry();

  it('handles "help" command and returns available command list', async () => {
    const dispatcher = new CommandDispatcher({ registry });
    const res = await dispatcher.dispatch('help');

    expect(res).toContain('Available Commands');
    expect(res).toContain('• Help');
    expect(res).toContain('• List Windows');
    expect(res).toContain('• Read Screen');
    expect(res).toContain('• Capture Screen');
  });

  it('handles "list windows" command using windows provider', async () => {
    const mockWindowsProvider = {
      enumerate: vi.fn().mockResolvedValue([
        { id: '1', title: 'Visual Studio Code', processName: 'Code.exe' },
        { id: '2', title: 'Google Chrome', processName: 'chrome.exe' },
        { id: '3', title: 'File Explorer', processName: 'explorer.exe' },
        { id: '4', title: 'Kai Desktop', processName: 'Kai.exe' },
      ]),
    };

    const dispatcher = new CommandDispatcher({
      registry,
      windowsProvider: mockWindowsProvider,
    });

    const res = await dispatcher.dispatch('list windows');

    expect(mockWindowsProvider.enumerate).toHaveBeenCalled();
    expect(res).toContain('Open Windows');
    expect(res).toContain('• Visual Studio Code');
    expect(res).toContain('• Google Chrome');
    expect(res).toContain('• File Explorer');
    expect(res).toContain('• Kai Desktop');
  });

  it('handles "read screen" command using vision capture and OCR pipeline', async () => {
    const mockVisionProvider = {
      captureScreen: vi.fn().mockResolvedValue({
        width: 1920,
        height: 1080,
        timestamp: Date.now(),
        image: new Uint8Array([255, 255, 255]),
      }),
      recognizeText: vi.fn().mockResolvedValue([
        'GitHub',
        'Merge pull request',
        'Actions',
        'Projects',
      ]),
    };

    const dispatcher = new CommandDispatcher({
      registry,
      visionProvider: mockVisionProvider,
    });

    const res = await dispatcher.dispatch('read screen');

    expect(mockVisionProvider.captureScreen).toHaveBeenCalled();
    expect(mockVisionProvider.recognizeText).toHaveBeenCalled();
    expect(res).toContain('Detected Text');
    expect(res).toContain('GitHub');
    expect(res).toContain('Merge pull request');
    expect(res).toContain('Actions');
    expect(res).toContain('Projects');
  });

  it('handles "capture screen" command and saves screenshot', async () => {
    const mockVisionProvider = {
      captureScreen: vi.fn().mockResolvedValue({
        width: 1920,
        height: 1080,
        timestamp: Date.now(),
        image: new Uint8Array([255, 255, 255]),
      }),
      recognizeText: vi.fn().mockResolvedValue([]),
    };

    const mockCaptureSaver = vi.fn().mockResolvedValue({
      savedPath: 'Pictures/Kai/capture-001.png',
    });

    const dispatcher = new CommandDispatcher({
      registry,
      visionProvider: mockVisionProvider,
      captureSaver: mockCaptureSaver,
    });

    const res = await dispatcher.dispatch('capture screen');

    expect(mockVisionProvider.captureScreen).toHaveBeenCalled();
    expect(mockCaptureSaver).toHaveBeenCalled();
    expect(res).toContain('Screenshot captured successfully.');
    expect(res).toContain('Pictures/Kai/capture-001.png');
  });

  it('handles unknown command with helpful guidance message', async () => {
    const dispatcher = new CommandDispatcher({ registry });
    const res = await dispatcher.dispatch('unknown_operation_xyz');

    expect(res).toContain('Unknown command.');
    expect(res).toContain('Type "help" to see available commands.');
  });
});

