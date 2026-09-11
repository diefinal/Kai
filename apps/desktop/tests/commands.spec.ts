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

  describe('AI-002 Desktop Actions Dispatching', () => {
    it('handles application launching in English and Turkish', async () => {
      const mockAppLauncher = {
        launch: vi.fn().mockImplementation(async (target: string) => {
          if (target === 'chrome') {
            return { success: true, alreadyOpen: false, appName: 'Google Chrome' };
          }
          if (target === 'vscode') {
            return { success: true, alreadyOpen: true, appName: 'Visual Studio Code' };
          }
          return { success: false, appName: target, error: 'Not found' };
        }),
      };

      const dispatcher = new CommandDispatcher({
        registry,
        appLauncher: mockAppLauncher,
      });

      const res1 = await dispatcher.dispatch("Chrome'u aç");
      expect(mockAppLauncher.launch).toHaveBeenCalledWith('chrome');
      expect(res1).toBe('Google Chrome açıldı.');

      const res2 = await dispatcher.dispatch('Open Chrome');
      expect(res2).toBe('Opened Google Chrome.');

      const res3 = await dispatcher.dispatch("VS Code'u aç");
      expect(res3).toBe('Visual Studio Code zaten açık. Ön plana getirdim.');

      const res4 = await dispatcher.dispatch('Open VS Code');
      expect(res4).toBe('Visual Studio Code is already open. Brought to front.');

      const res5 = await dispatcher.dispatch('Uygulama aç');
      expect(res5).toBe('Hangi uygulamayı açmamı istersin?');
    });

    it('handles window management actions (bring to front, minimize, maximize, close)', async () => {
      const mockWindowsProvider = {
        enumerate: vi.fn().mockResolvedValue([
          { id: '101', title: 'Google Chrome', processName: 'chrome.exe' },
          { id: '102', title: 'Visual Studio Code', processName: 'Code.exe' },
        ]),
        activateWindow: vi.fn().mockResolvedValue(true),
        minimizeWindow: vi.fn().mockResolvedValue(true),
        maximizeWindow: vi.fn().mockResolvedValue(true),
        closeWindow: vi.fn().mockResolvedValue(true),
      };

      const dispatcher = new CommandDispatcher({
        registry,
        windowsProvider: mockWindowsProvider,
      });

      const resBring = await dispatcher.dispatch('Bring Chrome to front');
      expect(mockWindowsProvider.activateWindow).toHaveBeenCalledWith('101');
      expect(resBring).toBe('Brought Google Chrome to front.');

      const resBringTr = await dispatcher.dispatch("Chrome'u öne getir");
      expect(resBringTr).toBe('Google Chrome ön plana getirildi.');

      const resMin = await dispatcher.dispatch('Minimize current window');
      expect(mockWindowsProvider.minimizeWindow).toHaveBeenCalled();
      expect(resMin).toBe('Window minimized.');

      const resMinTr = await dispatcher.dispatch('Pencereyi küçült');
      expect(resMinTr).toBe('Pencere simge durumuna küçültüldü.');

      const resMax = await dispatcher.dispatch('Maximize current window');
      expect(mockWindowsProvider.maximizeWindow).toHaveBeenCalled();
      expect(resMax).toBe('Window maximized.');

      const resClose = await dispatcher.dispatch('Close current window');
      expect(mockWindowsProvider.closeWindow).toHaveBeenCalled();
      expect(resClose).toBe('Window closed.');

      const resCloseTr = await dispatcher.dispatch('Pencereyi kapat');
      expect(resCloseTr).toBe('Pencere kapatıldı.');
    });

    it('handles mouse actions (move, left click, right click, double click)', async () => {
      const mockMouse = {
        move: vi.fn().mockResolvedValue(undefined),
        leftClick: vi.fn().mockResolvedValue(undefined),
        rightClick: vi.fn().mockResolvedValue(undefined),
        doubleClick: vi.fn().mockResolvedValue(undefined),
      };

      const dispatcher = new CommandDispatcher({
        registry,
        mouseController: mockMouse,
      });

      const resMove = await dispatcher.dispatch('Move mouse to 400, 600');
      expect(mockMouse.move).toHaveBeenCalledWith(400, 600);
      expect(resMove).toBe('Moved mouse to (400, 600).');

      const resMoveTr = await dispatcher.dispatch('Fareyi 300 500 konumuna taşı');
      expect(mockMouse.move).toHaveBeenCalledWith(300, 500);
      expect(resMoveTr).toBe('Fare (300, 500) konumuna taşındı.');

      const resLeft = await dispatcher.dispatch('Left click');
      expect(mockMouse.leftClick).toHaveBeenCalled();
      expect(resLeft).toBe('Left clicked.');

      const resRight = await dispatcher.dispatch('Sağ tıkla');
      expect(mockMouse.rightClick).toHaveBeenCalled();
      expect(resRight).toBe('Sağ tıklandı.');

      const resDouble = await dispatcher.dispatch('Çift tıkla');
      expect(mockMouse.doubleClick).toHaveBeenCalled();
      expect(resDouble).toBe('Çift tıklandı.');
    });

    it('handles keyboard actions (type text, press key, shortcuts)', async () => {
      const mockKeyboard = {
        typeText: vi.fn().mockResolvedValue(undefined),
        pressKey: vi.fn().mockResolvedValue(undefined),
        executeShortcut: vi.fn().mockResolvedValue(undefined),
      };

      const dispatcher = new CommandDispatcher({
        registry,
        keyboardController: mockKeyboard,
      });

      const resTypeEn = await dispatcher.dispatch('Type "Hello World"');
      expect(mockKeyboard.typeText).toHaveBeenCalledWith('Hello World');
      expect(resTypeEn).toBe('Typed "Hello World".');

      const resTypeTr = await dispatcher.dispatch('Metin yaz "Merhaba Kai"');
      expect(mockKeyboard.typeText).toHaveBeenCalledWith('Merhaba Kai');
      expect(resTypeTr).toBe('"Merhaba Kai" yazıldı.');

      const resEnter = await dispatcher.dispatch('Press Enter');
      expect(mockKeyboard.pressKey).toHaveBeenCalledWith('Enter');
      expect(resEnter).toBe('Pressed Enter.');

      const resEnterTr = await dispatcher.dispatch("Enter'a bas");
      expect(resEnterTr).toBe('Enter tuşuna basıldı.');

      const resCopy = await dispatcher.dispatch('Ctrl+C');
      expect(mockKeyboard.executeShortcut).toHaveBeenCalledWith('Ctrl+C');
      expect(resCopy).toBe('Executed Ctrl+C.');

      const resPasteTr = await dispatcher.dispatch('Yapıştır');
      expect(mockKeyboard.executeShortcut).toHaveBeenCalledWith('Ctrl+V');
      expect(resPasteTr).toBe('Ctrl+V kısayolu uygulandı.');
    });
  });
});
