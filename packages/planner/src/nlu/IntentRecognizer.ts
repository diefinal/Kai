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
      const namedTarget = this.extractMouseTarget(raw);
      if (namedTarget) {
        intent.parameters = { ...(intent.parameters || {}), target: namedTarget };
      } else {
        const relativeMove = this.extractRelativeMouseMove(raw);
        if (relativeMove) {
          intent.parameters = { ...(intent.parameters || {}), ...relativeMove };
        } else {
          const coords = this.extractCoordinates(raw);
          if (coords) {
            intent.parameters = { ...(intent.parameters || {}), ...coords };
          }
        }
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
    } else if (intent.name === 'NAVIGATE') {
      const url = this.extractUrl(raw);
      if (url) {
        intent.parameters = { ...(intent.parameters || {}), url };
      }
    } else if (intent.name === 'OPEN_FOLDER') {
      const folderPath = this.extractFolderPath(raw);
      if (folderPath) {
        intent.parameters = { ...(intent.parameters || {}), path: folderPath };
      }
    } else if (intent.name === 'NEW_TAB') {
      const url = this.extractUrl(raw);
      if (url) {
        intent.parameters = { ...(intent.parameters || {}), url };
      }
    } else if (intent.name === 'SWITCH_TAB') {
      const match = /(\d+)/.exec(raw);
      if (match) {
        intent.parameters = { ...(intent.parameters || {}), tabIndex: parseInt(match[1], 10) };
      }
    } else if (intent.name === 'QUERY_DOM') {
      const lower = raw.toLowerCase();
      const params: Record<string, unknown> = { ...(intent.parameters || {}) };

      const quoted = raw.match(/["']([^"']+)["']/);
      if (quoted) {
        params.text = quoted[1];
      }

      if (lower.includes('buton') || lower.includes('button')) {
        params.role = 'button';
        if (!params.text) {
          const btnMatch = raw.match(/(?:find\s+button\s+([a-zA-Z0-9_-]+)|([a-zA-Z0-9_-]+)\s+buton)/i);
          if (btnMatch) params.text = btnMatch[1] || btnMatch[2];
        }
      } else if (lower.includes('form')) {
        params.role = 'form';
        if (!params.text) {
          const formMatch = raw.match(/(?:find\s+([a-zA-Z0-9_-]+)\s+form|([a-zA-Z0-9_-]+)\s+form)/i);
          if (formMatch) params.text = formMatch[1] || formMatch[2];
        }
      } else if (lower.includes('link') || lower.includes('bağlantı') || lower.includes('baglanti')) {
        params.role = 'link';
        if (!params.text) {
          const linkMatch = raw.match(/(?:find\s+link\s+([a-zA-Z0-9_-]+)|([a-zA-Z0-9_-]+)\s+link)/i);
          if (linkMatch) params.text = linkMatch[1] || linkMatch[2];
        }
      } else if (
        lower.includes('input') ||
        lower.includes('alan') ||
        lower.includes('kutu') ||
        lower.includes('textbox')
      ) {
        params.tag = 'input';
      }

      if (lower.includes('email') || lower.includes('e-posta') || lower.includes('eposta')) {
        params.tag = 'input';
        params.placeholder = 'email';
      } else if (
        lower.includes('şifre') ||
        lower.includes('sifre') ||
        lower.includes('parola') ||
        lower.includes('password')
      ) {
        params.tag = 'input';
        params.type = 'password';
      } else if (lower.includes('search') || lower.includes('arama') || lower.includes('ara')) {
        if (params.role !== 'button') {
          params.tag = 'input';
          params.placeholder = params.text || 'search';
        }
      }

      intent.parameters = params;
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

  private extractUrl(text: string): string | undefined {
    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) return urlMatch[0];

    const wwwMatch = text.match(/\bwww\.[^\s]+/i);
    if (wwwMatch) return `https://${wwwMatch[0]}`;

    const lower = text.toLowerCase();
    if (lower.includes('github')) return 'https://github.com';
    if (lower.includes('youtube')) return 'https://youtube.com';
    if (lower.includes('google')) return 'https://google.com';

    const domainMatch = text.match(/\b([a-zA-Z0-9-]+\.(com|org|net|io|dev|ai|edu|gov|co))\b/i);
    if (domainMatch) return `https://${domainMatch[1]}`;

    return undefined;
  }

  private extractFolderPath(text: string): string | undefined {
    const winPathMatch = text.match(/([a-zA-Z]:\\[^"'\s\n\r]+)/);
    if (winPathMatch) return winPathMatch[1];

    const quotedMatch = text.match(/["']([a-zA-Z]:\\[^"']+|\/[^"']+)["']/);
    if (quotedMatch) return quotedMatch[1];

    const unixMatch = text.match(/(\/[\w.-]+(\/[\w.-]+)*)/);
    if (unixMatch) return unixMatch[1];

    return undefined;
  }

  private extractAppTarget(text: string): string | undefined {
    const lower = text.toLowerCase().replace(/i\u0307/g, 'i');
    if (lower.includes('chrome')) return 'chrome';
    if (lower.includes('edge')) return 'edge';
    if (lower.includes('tarayıcı') || lower.includes('tarayici') || lower.includes('browser')) {
      return 'chrome';
    }
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
    if (
      lower.includes('hesap makinesi') ||
      lower.includes('hesapmakinesi') ||
      lower.includes('calculator') ||
      lower.includes('calc')
    ) {
      return 'calc';
    }
    if (lower.includes('explorer') || lower.includes('gezgini') || lower.includes('dosya')) {
      return 'explorer';
    }
    if (lower.includes('powershell') || lower.includes('pwsh')) {
      return 'powershell';
    }
    if (
      lower.includes('komut istemi') ||
      lower.includes('komutistemi') ||
      lower.includes('command prompt') ||
      lower.includes('commandprompt') ||
      lower.includes('cmd')
    ) {
      return 'cmd';
    }
    if (lower.includes('terminal') || lower.includes('wt')) {
      return 'wt';
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

  /**
   * Extracts a named mouse target position from natural language.
   * Returns a canonical target string like 'top_right', 'center', etc.
   */
  private extractMouseTarget(text: string): string | undefined {
    const lower = text
      .toLowerCase()
      .replace(/i\u0307/g, 'i')
      .replace(/[.,?!:;'"()-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Turkish: sağ üst / sag ust
    if (
      (lower.includes('sağ') || lower.includes('sag')) &&
      (lower.includes('üst') || lower.includes('ust'))
    ) {
      return 'top_right';
    }
    // Turkish: sol üst / sol ust
    if (
      lower.includes('sol') &&
      (lower.includes('üst') || lower.includes('ust'))
    ) {
      return 'top_left';
    }
    // Turkish: sağ alt / sag alt
    if (
      (lower.includes('sağ') || lower.includes('sag')) &&
      lower.includes('alt')
    ) {
      return 'bottom_right';
    }
    // Turkish: sol alt
    if (lower.includes('sol') && lower.includes('alt')) {
      return 'bottom_left';
    }
    // English: top right
    if (lower.includes('top') && lower.includes('right')) {
      return 'top_right';
    }
    // English: top left
    if (lower.includes('top') && lower.includes('left')) {
      return 'top_left';
    }
    // English: bottom right
    if (lower.includes('bottom') && lower.includes('right')) {
      return 'bottom_right';
    }
    // English: bottom left
    if (lower.includes('bottom') && lower.includes('left')) {
      return 'bottom_left';
    }
    // Center / orta
    if (
      lower.includes('center') ||
      lower.includes('centre') ||
      lower.includes('middle') ||
      lower.includes('orta')
    ) {
      return 'center';
    }

    return undefined;
  }

  /**
   * Extracts relative mouse movement from natural language.
   * Returns deltaX / deltaY values for directional or pixel-based movement.
   */
  private extractRelativeMouseMove(
    text: string
  ): { deltaX: number; deltaY: number } | undefined {
    const lower = text
      .toLowerCase()
      .replace(/i\u0307/g, 'i')
      .replace(/[.,?!:;'"()-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract pixel count if present (e.g., "100 piksel", "100 pixels")
    const pixelMatch = /(\d+)\s*(?:piksel|pixel|px)?/.exec(lower);
    const amount = pixelMatch ? parseInt(pixelMatch[1], 10) : 100; // default 100px for "biraz"

    const isRelative =
      lower.includes('biraz') ||
      lower.includes('piksel') ||
      lower.includes('pixel') ||
      lower.includes('px') ||
      /\d+\s*(?:piksel|pixel|px)/.test(lower) ||
      // English relative patterns without number
      /move\s+(?:mouse|cursor)\s+(?:up|down|left|right)/i.test(lower);

    if (!isRelative) {
      return undefined;
    }

    // Determine direction
    if (
      lower.includes('yukarı') ||
      lower.includes('yukari') ||
      lower.includes(' up')
    ) {
      return { deltaX: 0, deltaY: -amount };
    }
    if (
      lower.includes('aşağı') ||
      lower.includes('asagi') ||
      lower.includes('indir') ||
      lower.includes(' down')
    ) {
      return { deltaX: 0, deltaY: amount };
    }
    if (
      lower.includes('sağa') ||
      lower.includes('saga') ||
      lower.includes(' right')
    ) {
      return { deltaX: amount, deltaY: 0 };
    }
    if (lower.includes('sola') || lower.includes(' left')) {
      return { deltaX: -amount, deltaY: 0 };
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
      .replace(/i\u0307/g, 'i')
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
