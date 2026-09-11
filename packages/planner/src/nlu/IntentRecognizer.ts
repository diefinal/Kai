import { Intent } from './Intent';

export interface IntentDefinition {
  name: string;
  patterns: string[];
  parameterExtractors?: Array<{
    paramName: string;
    regex: RegExp;
  }>;
}

export interface IntentRecognizerOptions {
  customIntents?: IntentDefinition[];
  confidenceThreshold?: number;
}

export interface IntentFollowUp {
  isFollowUpRequired: boolean;
  question?: string;
  language?: 'tr' | 'en';
}

export const DEFAULT_INTENTS: IntentDefinition[] = [
  {
    name: 'READ_SCREEN',
    patterns: [
      // English
      'read screen',
      'what do you see',
      'analyze this screen',
      'look at the screen',
      'read this screen',
      'what is on my screen',
      'ocr screen',
      'read text on screen',
      // Turkish
      'ekranı oku',
      'ekrani oku',
      'şu ekrana bak',
      'su ekrana bak',
      'ekrana bak',
      'bu ekranda ne var',
      'ekranda ne var',
      'bana bunu açıkla',
      'bana bunu acikla',
      'bunu açıkla',
      'ekrandaki yazıları oku',
      'ekrandaki metni oku',
    ],
  },
  {
    name: 'CAPTURE_SCREEN',
    patterns: [
      // English
      'capture',
      'capture screen',
      'take screenshot',
      'take a screenshot',
      'screenshot',
      'screen capture',
      'save screen',
      // Turkish
      'ekran görüntüsü al',
      'ekran goruntusu al',
      'ekran görüntüsü çek',
      'ekran resmi al',
      'screenshot al',
      'ss al',
      'ekranı kaydet',
    ],
  },
  {
    name: 'LIST_WINDOWS',
    patterns: [
      // English
      'list windows',
      'open windows',
      'show windows',
      'what windows are open',
      'active windows',
      'running applications',
      // Turkish
      'hangi pencereler açık',
      'hangi pencereler acik',
      'açık pencereler',
      'acik pencereler',
      'pencereleri listele',
      'açık uygulamalar',
      'hangi programlar açık',
    ],
  },
  {
    name: 'OPEN_FILE',
    patterns: [
      // English
      'open file',
      'open the file',
      // Turkish
      'dosyayı aç',
      'dosyayi ac',
      'dosya aç',
    ],
  },
  {
    name: 'HELP',
    patterns: [
      // English
      'help',
      'what can you do',
      'commands',
      'available commands',
      // Turkish
      'yardım',
      'yardim',
      'neler yapabilirsin',
      'komutlar',
    ],
  },
];

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

    // Check if parameters are missing for intents that require clarification (e.g. OPEN_FILE without file param)
    if (bestIntent.name === 'OPEN_FILE' && (!bestIntent.parameters || !bestIntent.parameters.file)) {
      const lang = this.detectLanguage(raw);
      bestIntent.parameters = {
        ...(bestIntent.parameters || {}),
        followUpQuestion:
          lang === 'tr'
            ? 'Hangi dosyayı açmamı istersin?'
            : 'Which file would you like me to open?',
      };
    }

    return bestIntent;
  }

  detectLanguage(text: string): 'tr' | 'en' {
    const lower = text.toLowerCase();
    const trMarkers = ['aç', 'oku', 'bak', 'ne', 'var', 'bana', 'bunu', 'açıkla', 'hangi', 'al', 'görüntü', 'resim', 'dosya'];
    const isTurkish = trMarkers.some((m) => lower.includes(m)) || /[çğıöşü]/i.test(lower);
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
