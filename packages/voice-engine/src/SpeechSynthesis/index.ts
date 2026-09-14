export type VoiceEmotion = 'neutral' | 'happy' | 'thinking' | 'warning' | 'error' | 'confirmation' | 'question';

export interface SynthesisOptions {
  pitch?: number;
  rate?: number;
  volume?: number;
  emotion?: VoiceEmotion;
}

export class SpeechSynthesisEngine {
  private isSpeaking = false;
  private currentAudioSource?: any;

  public async speak(text: string, options: SynthesisOptions = {}): Promise<{ durationMs: number; emotion: VoiceEmotion }> {
    this.isSpeaking = true;
    const emotion = options.emotion || 'neutral';
    
    // Calculate synthetic duration based on word count
    const wordCount = text.split(/\s+/).length;
    const durationMs = Math.max(800, wordCount * 280);

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.isSpeaking = false;
        resolve({ durationMs, emotion });
      }, 50); // fast resolution for event flow, returns estimated duration
    });
  }

  public stop(): void {
    this.isSpeaking = false;
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}
