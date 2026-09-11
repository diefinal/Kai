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

  it('handles "list windows" and natural Turkish prompts using windows provider', async () => {
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

    const res1 = await dispatcher.dispatch('list windows');
    expect(mockWindowsProvider.enumerate).toHaveBeenCalled();
    expect(res1).toContain('Open Windows');
    expect(res1).toContain('• Visual Studio Code');

    const res2 = await dispatcher.dispatch('hangi pencereler açık');
    expect(res2).toContain('Open Windows');
    expect(res2).toContain('• Google Chrome');
  });

  it('handles "read screen" and natural language prompts using vision capture and OCR pipeline', async () => {
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

    const res1 = await dispatcher.dispatch('Şu ekrana bak');
    expect(mockVisionProvider.captureScreen).toHaveBeenCalled();
    expect(mockVisionProvider.recognizeText).toHaveBeenCalled();
    expect(res1).toContain('Detected Text');
    expect(res1).toContain('GitHub');

    const res2 = await dispatcher.dispatch('What do you see');
    expect(res2).toContain('Detected Text');
    expect(res2).toContain('Merge pull request');
  });

  it('handles "capture screen" and screenshot requests', async () => {
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

    const res = await dispatcher.dispatch('ekran görüntüsü al');

    expect(mockVisionProvider.captureScreen).toHaveBeenCalled();
    expect(mockCaptureSaver).toHaveBeenCalled();
    expect(res).toContain('Screenshot captured successfully.');
    expect(res).toContain('Pictures/Kai/capture-001.png');
  });

  it('handles follow-up queries for incomplete commands like "Dosyayı aç"', async () => {
    const dispatcher = new CommandDispatcher({ registry });
    const res = await dispatcher.dispatch('Dosyayı aç');

    expect(res).toBe('Hangi dosyayı açmamı istersin?');
  });

  it('handles unknown command with follow-up guidance message in Turkish and English', async () => {
    const dispatcher = new CommandDispatcher({ registry });

    const trRes = await dispatcher.dispatch('anlamsız rastgele metin');
    expect(trRes).toBe('Bunu tam olarak anlayamadım. Size nasıl yardımcı olmamı istersiniz?');

    const enRes = await dispatcher.dispatch('unknown command something');
    expect(enRes).toBe("I didn't quite understand that. How would you like me to help?");
  });
});
