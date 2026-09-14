import { VoiceEmotion } from '../SpeechSynthesis';

export class EmotionController {
  public mapIntentToEmotion(intent: string, isError: boolean = false): VoiceEmotion {
    if (isError) return 'error';
    switch (intent.toUpperCase()) {
      case 'HELP':
      case 'GREETING':
        return 'happy';
      case 'CONFIRM':
      case 'EXECUTE':
        return 'confirmation';
      case 'QUERY':
      case 'SEARCH':
        return 'thinking';
      case 'WARN':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}
