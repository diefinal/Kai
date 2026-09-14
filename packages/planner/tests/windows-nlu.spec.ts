import { describe, it, expect } from 'vitest';
import { IntentRecognizer } from '../src/nlu/IntentRecognizer';

describe('INTEGRATION-001 Windows Runtime NLU & Intent Recognition', () => {
  const recognizer = new IntentRecognizer();

  describe('Windows Applications Launch (Turkish & English)', () => {
    const appCases: Array<{
      input: string;
      expectedTarget: string;
      description: string;
    }> = [
      // Notepad
      { input: "Not Defteri'ni aç", expectedTarget: 'notepad', description: "Not Defteri'ni aç" },
      { input: 'Not Defterini aç', expectedTarget: 'notepad', description: 'Not Defterini aç' },
      { input: 'Open Notepad', expectedTarget: 'notepad', description: 'Open Notepad' },

      // Calculator
      { input: "Hesap Makinesi'ni aç", expectedTarget: 'calc', description: "Hesap Makinesi'ni aç" },
      { input: 'Hesap makinesini aç', expectedTarget: 'calc', description: 'Hesap makinesini aç' },
      { input: 'Launch Calculator', expectedTarget: 'calc', description: 'Launch Calculator' },

      // Explorer
      { input: "Dosya Gezgini'ni aç", expectedTarget: 'explorer', description: "Dosya Gezgini'ni aç" },
      { input: 'Open Explorer', expectedTarget: 'explorer', description: 'Open Explorer' },

      // Chrome
      { input: "Chrome'u aç", expectedTarget: 'chrome', description: "Chrome'u aç" },
      { input: 'Open Chrome', expectedTarget: 'chrome', description: 'Open Chrome' },

      // Edge
      { input: "Edge'i aç", expectedTarget: 'edge', description: "Edge'i aç" },
      { input: 'Start Edge', expectedTarget: 'edge', description: 'Start Edge' },

      // VS Code
      { input: "VS Code'u aç", expectedTarget: 'vscode', description: "VS Code'u aç" },
      { input: 'Open VS Code', expectedTarget: 'vscode', description: 'Open VS Code' },

      // PowerShell
      { input: 'PowerShell aç', expectedTarget: 'powershell', description: 'PowerShell aç' },
      { input: 'Open PowerShell', expectedTarget: 'powershell', description: 'Open PowerShell' },

      // Terminal
      { input: 'Terminal aç', expectedTarget: 'wt', description: 'Terminal aç' },
      { input: 'Open Terminal', expectedTarget: 'wt', description: 'Open Terminal' },

      // Command Prompt
      { input: 'Komut İstemini aç', expectedTarget: 'cmd', description: 'Komut İstemini aç' },
      { input: 'Open Command Prompt', expectedTarget: 'cmd', description: 'Open Command Prompt' },
    ];

    for (const testCase of appCases) {
      it(`recognizes "${testCase.input}" (${testCase.description}) -> ${testCase.expectedTarget}`, () => {
        const intent = recognizer.recognize(testCase.input);
        expect(intent.name).toBe('OPEN_APPLICATION');
        expect(intent.parameters?.target).toBe(testCase.expectedTarget);
      });
    }
  });

  describe('Active Window Controls (Turkish & English)', () => {
    it('recognizes minimize commands', () => {
      expect(recognizer.recognize('aktif pencereyi küçült').name).toBe('MINIMIZE_WINDOW');
      expect(recognizer.recognize('pencereyi küçült').name).toBe('MINIMIZE_WINDOW');
      expect(recognizer.recognize('Minimize current window').name).toBe('MINIMIZE_WINDOW');
    });

    it('recognizes maximize commands', () => {
      expect(recognizer.recognize('aktif pencereyi büyüt').name).toBe('MAXIMIZE_WINDOW');
      expect(recognizer.recognize('pencereyi büyüt').name).toBe('MAXIMIZE_WINDOW');
      expect(recognizer.recognize('Maximize current window').name).toBe('MAXIMIZE_WINDOW');
    });

    it('recognizes close window commands', () => {
      expect(recognizer.recognize('aktif pencereyi kapat').name).toBe('CLOSE_WINDOW');
      expect(recognizer.recognize('pencereyi kapat').name).toBe('CLOSE_WINDOW');
      expect(recognizer.recognize('Close current window').name).toBe('CLOSE_WINDOW');
    });
  });
  describe('Mouse Commands (AI-004)', () => {
    it('recognizes target based mouse movements (Turkish)', () => {
      let intent = recognizer.recognize('Fareyi sağ üst köşeye götür.');
      expect(intent.name).toBe('MOVE_MOUSE');
      expect(intent.parameters?.target).toBe('top_right');

      intent = recognizer.recognize('Fareyi ekranın ortasına getir.');
      expect(intent.name).toBe('MOVE_MOUSE');
      expect(intent.parameters?.target).toBe('center');

      intent = recognizer.recognize('İmleci sol alta taşı.');
      expect(intent.name).toBe('MOVE_MOUSE');
      expect(intent.parameters?.target).toBe('bottom_left');
    });

    it('recognizes target based mouse movements (English)', () => {
      let intent = recognizer.recognize('Move mouse to the center.');
      expect(intent.name).toBe('MOVE_MOUSE');
      expect(intent.parameters?.target).toBe('center');

      intent = recognizer.recognize('Move cursor to top right.');
      expect(intent.name).toBe('MOVE_MOUSE');
      expect(intent.parameters?.target).toBe('top_right');
    });

    it('recognizes relative mouse movements (Turkish & English)', () => {
      let intent = recognizer.recognize("Mouse'u biraz yukarı götür.");
      expect(intent.name).toBe('MOVE_MOUSE');
      expect(intent.parameters?.deltaX).toBe(0);
      expect(intent.parameters?.deltaY).toBe(-100);

      intent = recognizer.recognize('Fareyi 100 piksel sağa götür.');
      expect(intent.name).toBe('MOVE_MOUSE');
      expect(intent.parameters?.deltaX).toBe(100);
      expect(intent.parameters?.deltaY).toBe(0);

      intent = recognizer.recognize('Fareyi biraz aşağı indir.');
      expect(intent.name).toBe('MOVE_MOUSE');
      expect(intent.parameters?.deltaX).toBe(0);
      expect(intent.parameters?.deltaY).toBe(100);

      intent = recognizer.recognize('Move mouse 100 pixels left.');
      expect(intent.name).toBe('MOVE_MOUSE');
      expect(intent.parameters?.deltaX).toBe(-100);
      expect(intent.parameters?.deltaY).toBe(0);
    });
  });
});
