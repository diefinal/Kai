export interface WakeWordDetectorOptions {
  wakeWords?: string[];
  sensitivity?: number;
}

export type WakeWordCallback = (detectedWord: string) => void;

export class WakeWordDetector {
  private isListening = false;
  private wakeWords: string[];
  private callback?: WakeWordCallback;

  constructor(options: WakeWordDetectorOptions = {}) {
    this.wakeWords = (options.wakeWords || ['kai', 'hey kai']).map(w => w.toLowerCase());
  }

  public start(onDetected: WakeWordCallback): void {
    this.isListening = true;
    this.callback = onDetected;
  }

  public stop(): void {
    this.isListening = false;
    this.callback = undefined;
  }

  public feedAudioFrame(transcriptCandidate: string): boolean {
    if (!this.isListening) return false;
    const lower = transcriptCandidate.toLowerCase().trim();
    for (const word of this.wakeWords) {
      if (lower === word || lower.startsWith(word + ' ') || lower.endsWith(' ' + word)) {
        if (this.callback) {
          this.callback(word);
        }
        return true;
      }
    }
    return false;
  }

  public getStatus(): boolean {
    return this.isListening;
  }
}
