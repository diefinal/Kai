import { describe, it, expect } from 'vitest';
import {
  IntentRecognizer,
  DEFAULT_INTENTS,
  Goal,
  PlanBuilder,
} from '../src';

describe('AI-001 Natural Language Understanding (NLU)', () => {
  const recognizer = new IntentRecognizer();

  describe('READ_SCREEN Intent Variations', () => {
    const inputs = [
      'Read screen',
      'Ekranı oku',
      'Şu ekrana bak',
      'Bu ekranda ne var',
      'Bana bunu açıkla',
      'What do you see',
      'Analyze this screen',
    ];

    inputs.forEach((input) => {
      it(`recognizes "${input}" as READ_SCREEN intent`, () => {
        const intent = recognizer.recognize(input);
        expect(intent.name).toBe('READ_SCREEN');
        expect(intent.confidence).toBeGreaterThanOrEqual(0.5);
      });
    });
  });

  describe('CAPTURE_SCREEN Intent Variations', () => {
    const inputs = [
      'capture',
      'ekran görüntüsü al',
      'screenshot al',
      'take screenshot',
      'ss al',
    ];

    inputs.forEach((input) => {
      it(`recognizes "${input}" as CAPTURE_SCREEN intent`, () => {
        const intent = recognizer.recognize(input);
        expect(intent.name).toBe('CAPTURE_SCREEN');
        expect(intent.confidence).toBeGreaterThanOrEqual(0.5);
      });
    });
  });

  describe('LIST_WINDOWS Intent Variations', () => {
    const inputs = [
      'hangi pencereler açık',
      'list windows',
      'open windows',
      'açık pencereler',
      'pencereleri listele',
    ];

    inputs.forEach((input) => {
      it(`recognizes "${input}" as LIST_WINDOWS intent`, () => {
        const intent = recognizer.recognize(input);
        expect(intent.name).toBe('LIST_WINDOWS');
        expect(intent.confidence).toBeGreaterThanOrEqual(0.5);
      });
    });
  });

  describe('Unknown Intent and Follow-up Questions', () => {
    it('asks follow-up question for OPEN_FILE without file argument in Turkish', () => {
      const intent = recognizer.recognize('Dosyayı aç');
      expect(intent.name).toBe('OPEN_FILE');
      expect(intent.parameters?.followUpQuestion).toBe('Hangi dosyayı açmamı istersin?');
    });

    it('asks follow-up question for OPEN_FILE without file argument in English', () => {
      const intent = recognizer.recognize('Open file');
      expect(intent.name).toBe('OPEN_FILE');
      expect(intent.parameters?.followUpQuestion).toBe('Which file would you like me to open?');
    });

    it('returns follow-up question for completely unknown input', () => {
      const intent = recognizer.recognize('qwerty xyz 12345');
      expect(intent.name).toBe('UNKNOWN');
      expect(intent.parameters?.followUpQuestion).toBeDefined();
    });
  });

  describe('Multi-language Support (Turkish & English)', () => {
    it('detects Turkish language accurately', () => {
      expect(recognizer.detectLanguage('Bu ekranda ne var?')).toBe('tr');
      expect(recognizer.detectLanguage('Dosyayı aç')).toBe('tr');
      expect(recognizer.detectLanguage('ekran resmi al')).toBe('tr');
    });

    it('detects English language accurately', () => {
      expect(recognizer.detectLanguage('What do you see on the screen?')).toBe('en');
      expect(recognizer.detectLanguage('List active windows')).toBe('en');
    });
  });

  describe('PlanBuilder Integration with NLU', () => {
    const builder = new PlanBuilder();

    it('generates OCR and Capture tasks for natural Turkish screen read prompt', () => {
      const goal: Goal = {
        id: 'g-1',
        instruction: 'Şu ekrana bak',
        createdAt: Date.now(),
      };
      const plan = builder.build({ goal });
      expect(plan.tasks).toHaveLength(2);
      expect(plan.tasks[0].title).toBe('Capture Screen');
      expect(plan.tasks[1].title).toBe('OCR');
    });

    it('generates Capture Screen task for Turkish screenshot prompt', () => {
      const goal: Goal = {
        id: 'g-2',
        instruction: 'ekran görüntüsü al',
        createdAt: Date.now(),
      };
      const plan = builder.build({ goal });
      expect(plan.tasks).toHaveLength(1);
      expect(plan.tasks[0].title).toBe('Capture Screen');
    });

    it('generates Get Windows task for Turkish list windows prompt', () => {
      const goal: Goal = {
        id: 'g-3',
        instruction: 'hangi pencereler açık',
        createdAt: Date.now(),
      };
      const plan = builder.build({ goal });
      expect(plan.tasks).toHaveLength(1);
      expect(plan.tasks[0].title).toBe('Get Windows');
    });
  });

  describe('AI-002 Desktop Action Intents', () => {
    describe('OPEN_APPLICATION', () => {
      it('recognizes open chrome in English and Turkish', () => {
        const resEn = recognizer.recognize('Open Chrome');
        expect(resEn.name).toBe('OPEN_APPLICATION');
        expect(resEn.parameters?.target).toBe('chrome');

        const resTr = recognizer.recognize("Chrome'u aç");
        expect(resTr.name).toBe('OPEN_APPLICATION');
        expect(resTr.parameters?.target).toBe('chrome');
      });

      it('recognizes VS Code, Edge, Notepad, File Explorer', () => {
        expect(recognizer.recognize('Visual Studio Code aç').parameters?.target).toBe('vscode');
        expect(recognizer.recognize('Open Edge').parameters?.target).toBe('edge');
        expect(recognizer.recognize('Notepad aç').parameters?.target).toBe('notepad');
        expect(recognizer.recognize('Dosya Gezgini aç').parameters?.target).toBe('explorer');
      });

      it('asks follow-up if application target is missing', () => {
        const res = recognizer.recognize('Uygulama aç');
        expect(res.name).toBe('OPEN_APPLICATION');
        expect(res.parameters?.followUpQuestion).toBe('Hangi uygulamayı açmamı istersin?');
      });
    });

    describe('Window Control Intents', () => {
      it('recognizes BRING_TO_FRONT', () => {
        const res1 = recognizer.recognize('Bring Chrome to front');
        expect(res1.name).toBe('BRING_TO_FRONT');
        expect(res1.parameters?.target).toBe('chrome');

        const res2 = recognizer.recognize("VS Code'a geç");
        expect(res2.name).toBe('BRING_TO_FRONT');
        expect(res2.parameters?.target).toBe('vscode');
      });

      it('recognizes MINIMIZE_WINDOW', () => {
        expect(recognizer.recognize('Minimize current window').name).toBe('MINIMIZE_WINDOW');
        expect(recognizer.recognize('Pencereyi küçült').name).toBe('MINIMIZE_WINDOW');
      });

      it('recognizes MAXIMIZE_WINDOW', () => {
        expect(recognizer.recognize('Maximize current window').name).toBe('MAXIMIZE_WINDOW');
        expect(recognizer.recognize('Pencereyi büyüt').name).toBe('MAXIMIZE_WINDOW');
      });

      it('recognizes CLOSE_WINDOW', () => {
        expect(recognizer.recognize('Close current window').name).toBe('CLOSE_WINDOW');
        expect(recognizer.recognize('Pencereyi kapat').name).toBe('CLOSE_WINDOW');
      });
    });

    describe('Mouse Intents', () => {
      it('recognizes MOVE_MOUSE with coordinates', () => {
        const res1 = recognizer.recognize('Move mouse to 500, 300');
        expect(res1.name).toBe('MOVE_MOUSE');
        expect(res1.parameters?.x).toBe(500);
        expect(res1.parameters?.y).toBe(300);

        const res2 = recognizer.recognize('Fareyi 100 200 konumuna taşı');
        expect(res2.name).toBe('MOVE_MOUSE');
        expect(res2.parameters?.x).toBe(100);
        expect(res2.parameters?.y).toBe(200);
      });

      it('recognizes MOUSE_CLICK types', () => {
        const left = recognizer.recognize('Left click');
        expect(left.name).toBe('MOUSE_CLICK');
        expect(left.parameters?.button).toBe('left');
        expect(left.parameters?.type).toBe('single');

        const right = recognizer.recognize('Sağ tıkla');
        expect(right.name).toBe('MOUSE_CLICK');
        expect(right.parameters?.button).toBe('right');

        const dbl = recognizer.recognize('Çift tıkla');
        expect(dbl.name).toBe('MOUSE_CLICK');
        expect(dbl.parameters?.type).toBe('double');
      });
    });

    describe('Keyboard Intents', () => {
      it('recognizes TYPE_TEXT with parameters', () => {
        const res1 = recognizer.recognize('Type "Hello World"');
        expect(res1.name).toBe('TYPE_TEXT');
        expect(res1.parameters?.text).toBe('Hello World');

        const res2 = recognizer.recognize('Metin yaz "Kai AI"');
        expect(res2.name).toBe('TYPE_TEXT');
        expect(res2.parameters?.text).toBe('Kai AI');
      });

      it('recognizes PRESS_KEY for Enter, Tab, Escape', () => {
        expect(recognizer.recognize('Press Enter').parameters?.key).toBe('Enter');
        expect(recognizer.recognize("Tab'a bas").parameters?.key).toBe('Tab');
        expect(recognizer.recognize('Esc tuşuna bas').parameters?.key).toBe('Escape');
      });

      it('recognizes KEY_SHORTCUT for Ctrl+C, Ctrl+V, Ctrl+A', () => {
        expect(recognizer.recognize('Ctrl+C').parameters?.shortcut).toBe('Ctrl+C');
        expect(recognizer.recognize('Kopyala').parameters?.shortcut).toBe('Ctrl+C');
        expect(recognizer.recognize('Yapıştır').parameters?.shortcut).toBe('Ctrl+V');
        expect(recognizer.recognize('Hepsini seç').parameters?.shortcut).toBe('Ctrl+A');
      });
    });
  });
});
