import { WakeWordDetector } from '../WakeWord';
import { SpeechRecognitionEngine } from '../SpeechRecognition';
import { SpeechSynthesisEngine } from '../SpeechSynthesis';
import { LipSyncEngine, VisemeFrame } from '../LipSync';
import { EmotionController } from '../EmotionController';
import { VoiceSettings } from '../VoiceSettings';

export interface AudioRouterEvents {
  onListeningStart?: () => void;
  onListeningStop?: () => void;
  onSpeakingStart?: (frames: VisemeFrame[]) => void;
  onSpeakingStop?: () => void;
  onInterruption?: () => void;
}

export class AudioRouter {
  public wakeWord: WakeWordDetector;
  public stt: SpeechRecognitionEngine;
  public tts: SpeechSynthesisEngine;
  public lipSync: LipSyncEngine;
  public emotion: EmotionController;
  public settings: VoiceSettings;
  private events: AudioRouterEvents = {};

  constructor() {
    this.wakeWord = new WakeWordDetector();
    this.stt = new SpeechRecognitionEngine();
    this.tts = new SpeechSynthesisEngine();
    this.lipSync = new LipSyncEngine();
    this.emotion = new EmotionController();
    this.settings = new VoiceSettings();
  }

  public registerEvents(events: AudioRouterEvents): void {
    this.events = events;
  }

  public startListeningPipeline(onCommandRecognized: (text: string) => Promise<string>): void {
    this.wakeWord.start((detectedWord) => {
      // Interruption check: If currently speaking and wake word detected, stop immediately
      if (this.tts.isCurrentlySpeaking()) {
        this.tts.stop();
        if (this.events.onInterruption) this.events.onInterruption();
      }

      if (this.events.onListeningStart) this.events.onListeningStart();

      this.stt.startListening(async (transcription, isFinal) => {
        if (isFinal && transcription.trim().length > 0) {
          this.stt.stopListening();
          if (this.events.onListeningStop) this.events.onListeningStop();

          const replyText = await onCommandRecognized(transcription);
          if (replyText) {
            await this.speakResponse(replyText);
          }
        }
      });
    });
  }

  public async speakResponse(text: string): Promise<void> {
    const emotion = this.emotion.mapIntentToEmotion('CONFIRM');
    const { durationMs } = await this.tts.speak(text, { emotion });
    const frames = this.lipSync.generateLipSync(text, durationMs);

    if (this.events.onSpeakingStart) this.events.onSpeakingStart(frames);

    setTimeout(() => {
      if (this.events.onSpeakingStop) this.events.onSpeakingStop();
    }, durationMs);
  }

  public interrupt(): void {
    if (this.tts.isCurrentlySpeaking()) {
      this.tts.stop();
      if (this.events.onInterruption) this.events.onInterruption();
      if (this.events.onSpeakingStop) this.events.onSpeakingStop();
    }
  }
}
