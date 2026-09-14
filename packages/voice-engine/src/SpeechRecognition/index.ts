export interface SpeechRecognitionOptions {
  language?: 'tr-TR' | 'en-US';
  continuous?: boolean;
}

export type RecognitionCallback = (text: string, isFinal: boolean) => void;

export class SpeechRecognitionEngine {
  private active = false;
  private language: 'tr-TR' | 'en-US';
  private callback?: RecognitionCallback;

  constructor(options: SpeechRecognitionOptions = {}) {
    this.language = options.language || 'tr-TR';
  }

  public setLanguage(lang: 'tr-TR' | 'en-US'): void {
    this.language = lang;
  }

  public startListening(callback: RecognitionCallback): void {
    this.active = true;
    this.callback = callback;
  }

  public stopListening(): void {
    this.active = false;
    this.callback = undefined;
  }

  public processAudioStream(simulatedInput: string, isFinal: boolean = true): void {
    if (!this.active || !this.callback) return;
    this.callback(simulatedInput, isFinal);
  }

  public isRunning(): boolean {
    return this.active;
  }
}
