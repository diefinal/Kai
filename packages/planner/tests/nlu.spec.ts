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
});
