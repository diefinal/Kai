import { Intent } from './Intent';
import { DEFAULT_INTENTS, IntentDefinition } from './DefaultIntents';

export { DEFAULT_INTENTS, type IntentDefinition } from './DefaultIntents';

export interface IntentRecognizerOptions {
  customIntents?: IntentDefinition[];
  confidenceThreshold?: number;
}

export interface IntentFollowUp {
  isFollowUpRequired: boolean;
  question?: string;
  language?: 'tr' | 'en';
}

export class IntentRecognizer {
  private readonly intents: IntentDefinition[];
  private readonly threshold: number;

  constructor(options: IntentRecognizerOptions = {}) {
    this.intents = options.customIntents || DEFAULT_INTENTS;
    this.threshold = options.confidenceThreshold ?? 0.5;
  }

  recognize(input: string): Intent {
    const raw = input.trim();
    if (!raw) {
      return {
        name: 'UNKNOWN',
        confidence: 0,
      };
    }

    const normalized = this.normalize(raw);

    let bestIntent: Intent = {
      name: 'UNKNOWN',
      confidence: 0,
    };

    for (const def of this.intents) {
      for (const pattern of def.patterns) {
        const normPattern = this.normalize(pattern);
        const score = this.calculateSimilarity(normalized, normPattern);

        if (score > bestIntent.confidence) {
          bestIntent = {
            name: def.name,
            confidence: score,
            parameters: this.extractParameters(raw, def),
          };
        }
      }
    }

    if (bestIntent.confidence < this.threshold) {
      return {
        name: 'UNKNOWN',
        confidence: bestIntent.confidence,
        parameters: this.generateUnknownFollowUp(raw),
      };
    }

    // Post-process parameters according to specific intent semantics
    this.enrichIntentParameters(bestIntent, raw);

    return bestIntent;
  }

  private enrichIntentParameters(intent: Intent, raw: string): void {
    const lang = this.detectLanguage(raw);

    if (intent.name === 'OPEN_APPLICATION' || intent.name === 'BRING_TO_FRONT') {
      const target = this.extractAppTarget(raw);
      if (target) {
        intent.parameters = { ...(intent.parameters || {}), target };
      } else if (intent.name === 'OPEN_APPLICATION') {
        intent.parameters = {
          ...(intent.parameters || {}),
          followUpQuestion:
            lang === 'tr'
              ? 'Hangi uygulamayı açmamı istersin?'
              : 'Which application would you like me to open?',
        };
      }
    } else if (intent.name === 'MOVE_MOUSE') {
      const coords = this.extractCoordinates(raw);
      if (coords) {
        intent.parameters = { ...(intent.parameters || {}), ...coords };
      }
    } else if (intent.name === 'MOUSE_CLICK') {
      const clickInfo = this.extractClickInfo(raw);
      intent.parameters = { ...(intent.parameters || {}), ...clickInfo };
    } else if (intent.name === 'TYPE_TEXT') {
      const text = this.extractTypeText(raw);
      if (text !== undefined) {
        intent.parameters = { ...(intent.parameters || {}), text };
      }
    } else if (intent.name === 'PRESS_KEY') {
      const key = this.extractKeyName(raw);
      if (key) {
        intent.parameters = { ...(intent.parameters || {}), key };
      }
    } else if (intent.name === 'KEY_SHORTCUT') {
      const shortcut = this.extractShortcutName(raw);
      if (shortcut) {
        intent.parameters = { ...(intent.parameters || {}), shortcut };
      }
    } else if (intent.name === 'OPEN_FILE' && (!intent.parameters || !intent.parameters.file)) {
      intent.parameters = {
        ...(intent.parameters || {}),
        followUpQuestion:
          lang === 'tr'
            ? 'Hangi dosyayı açmamı istersin?'
            : 'Which file would you like me to open?',
      };
    }
  }

  private extractAppTarget(text: string): string | undefined {
    const lower = text.toLowerCase();
    if (lower.includes('chrome')) return 'chrome';
    if (lower.includes('edge')) return 'edge';
    if (
      lower.includes('visual studio code') ||
      lower.includes('vs code') ||
      lower.includes('vscode') ||
      /\bcode\b/.test(lower)
    ) {
      return 'vscode';
    }
    if (lower.includes('notepad') || lower.includes('not defteri') || lower.includes('notdefteri')) {
      return 'notepad';
    }
    if (lower.includes('explorer') || lower.includes('gezgini') || lower.includes('dosya')) {
      return 'explorer';
    }
    return undefined;
  }

  private extractCoordinates(text: string): { x: number; y: number } | undefined {
    const match = /(?:to|konumuna|noktasına)?\s*\(?(\d+)\s*[,x\s]\s*(\d+)\)?/i.exec(text);
    if (match && match[1] && match[2]) {
      return {
        x: parseInt(match[1], 10),
        y: parseInt(match[2], 10),
      };
    }
    return undefined;
  }

  private extractClickInfo(text: string): { button: 'left' | 'right'; type: 'single' | 'double' } {
    const lower = text.toLowerCase();
    const isRight = lower.includes('right') || lower.includes('sağ') || lower.includes('sag');
    const isDouble = lower.includes('double') || lower.includes('çift') || lower.includes('cift');
    return {
      button: isRight ? 'right' : 'left',
      type: isDouble ? 'double' : 'single',
    };
  }

  private extractTypeText(text: string): string | undefined {
    const quoteMatch = /["'“](.*?)["'”]/.exec(text);
    if (quoteMatch && quoteMatch[1] !== undefined) {
      return quoteMatch[1];
    }
    const typeMatch = /(?:type|yaz|yazı|metin)\s+(.+)$/i.exec(text);
    if (typeMatch && typeMatch[1]) {
      return typeMatch[1].trim();
    }
    return undefined;
  }

  private extractKeyName(text: string): string | undefined {
    const lower = text.toLowerCase();
    if (lower.includes('enter')) return 'Enter';
    if (lower.includes('tab')) return 'Tab';
    if (lower.includes('esc') || lower.includes('escape')) return 'Escape';
    return undefined;
  }

  private extractShortcutName(text: string): string | undefined {
    const lower = text.toLowerCase();
    if (
      lower.includes('ctrl c') ||
      lower.includes('ctrl+c') ||
      lower.includes('control c') ||
      lower.includes('kopyala') ||
      lower.includes('copy')
    ) {
      return 'Ctrl+C';
    }
    if (
      lower.includes('ctrl v') ||
      lower.includes('ctrl+v') ||
      lower.includes('control v') ||
      lower.includes('yapıştır') ||
      lower.includes('yapistir') ||
      lower.includes('paste')
    ) {
      return 'Ctrl+V';
    }
    if (
      lower.includes('ctrl a') ||
      lower.includes('ctrl+a') ||
      lower.includes('control a') ||
      lower.includes('hepsini seç') ||
      lower.includes('tümünü seç') ||
      lower.includes('tumunu sec') ||
      lower.includes('select all')
    ) {
      return 'Ctrl+A';
    }
    return undefined;
  }

  detectLanguage(text: string): 'tr' | 'en' {
    const lower = text.toLowerCase();
    if (/[çğıöşü]/i.test(lower)) {
      return 'tr';
    }

    const trKeywords = [
      'aç', 'ac', 'oku', 'bak', 'ne', 'var', 'bana', 'bunu', 'açıkla', 'acikla',
      'hangi', 'al', 'görüntü', 'resim', 'dosya', 'yaz', 'bas', 'tıkla', 'tikla',
      'küçült', 'kucult', 'büyüt', 'buyut', 'kapat', 'öne', 'one', 'geç', 'gec',
      'fare', 'kopyala', 'yapıştır', 'yapistir', 'seç', 'sec', 'defteri', 'gezgini'
    ];

    const words = lower.split(/\s+/).map((w) => w.replace(/[.,?!:;'"()-]/g, ''));
    const isTurkish = words.some((word) =>
      trKeywords.includes(word) ||
      word.endsWith('a') && trKeywords.includes(word.slice(0, -1)) ||
      word.endsWith('e') && trKeywords.includes(word.slice(0, -1)) ||
      word.startsWith('ekran') ||
      word.startsWith('pencere')
    );

    return isTurkish ? 'tr' : 'en';
  }

  getFollowUpForUnknown(input: string): string {
    const lang = this.detectLanguage(input);
    return lang === 'tr'
      ? 'Bunu tam olarak anlayamadım. Size nasıl yardımcı olmamı istersiniz?'
      : "I didn't quite understand that. How would you like me to help?";
  }

  private generateUnknownFollowUp(input: string): Record<string, unknown> {
    return {
      followUpQuestion: this.getFollowUpForUnknown(input),
    };
  }

  private normalize(str: string): string {
    return str
      .toLowerCase()
      .replace(/[.,?!:;'"()-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateSimilarity(input: string, pattern: string): number {
    if (input === pattern) {
      return 1.0;
    }

    // If input contains exact pattern or pattern contains exact input
    if (input.includes(pattern) || pattern.includes(input)) {
      const matchLen = Math.min(input.length, pattern.length);
      const maxLen = Math.max(input.length, pattern.length);
      return Math.max(0.75, matchLen / maxLen);
    }

    // Token intersection (Jaccard-like)
    const inputTokens = new Set(input.split(' ').filter(Boolean));
    const patternTokens = new Set(pattern.split(' ').filter(Boolean));

    let intersectionCount = 0;
    for (const token of inputTokens) {
      if (patternTokens.has(token)) {
        intersectionCount++;
      }
    }

    const unionCount = new Set([...inputTokens, ...patternTokens]).size;
    if (unionCount === 0) return 0;

    const jaccard = intersectionCount / unionCount;
    return jaccard;
  }

  private extractParameters(
    input: string,
    def: IntentDefinition
  ): Record<string, unknown> | undefined {
    if (!def.parameterExtractors || def.parameterExtractors.length === 0) {
      return undefined;
    }

    const params: Record<string, unknown> = {};
    for (const extractor of def.parameterExtractors) {
      const match = extractor.regex.exec(input);
      if (match && match[1]) {
        params[extractor.paramName] = match[1].trim();
      }
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }
}
