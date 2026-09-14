import { describe, it, expect, vi } from 'vitest';
import { WakeWordDetector } from '../src/WakeWord';
import { SpeechRecognitionEngine } from '../src/SpeechRecognition';
import { SpeechSynthesisEngine } from '../src/SpeechSynthesis';
import { LipSyncEngine } from '../src/LipSync';
import { AudioRouter } from '../src/AudioRouter';

describe('Voice Engine Unit Tests', () => {
  it('should detect wake words correctly', () => {
    const detector = new WakeWordDetector({ wakeWords: ['Kai'] });
    let detected = false;
    detector.start((word) => {
      detected = true;
      expect(word).toBe('kai');
    });

    const triggered = detector.feedAudioFrame('Kai beni dinle');
    expect(triggered).toBe(true);
    expect(detected).toBe(true);
  });

  it('should process speech recognition stream', () => {
    const stt = new SpeechRecognitionEngine({ language: 'tr-TR' });
    let result = '';
    stt.startListening((text, isFinal) => {
      result = text;
      expect(isFinal).toBe(true);
    });

    stt.processAudioStream('Chrome aç', true);
    expect(result).toBe('Chrome aç');
  });

  it('should generate speech with lip sync visemes', async () => {
    const tts = new SpeechSynthesisEngine();
    const lipSync = new LipSyncEngine();

    const { durationMs } = await tts.speak('Merhaba Kai');
    expect(durationMs).toBeGreaterThan(0);

    const frames = lipSync.generateLipSync('Merhaba Kai', durationMs);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0].mouthOpen).toBeDefined();
  });

  it('should support instant interruption when speaking', async () => {
    const router = new AudioRouter();
    let interrupted = false;

    router.registerEvents({
      onInterruption: () => {
        interrupted = true;
      }
    });

    // Start speaking
    const speakPromise = router.speakResponse('Uzun bir cevap metni...');
    expect(router.tts.isCurrentlySpeaking()).toBe(true);

    // Trigger interruption
    router.interrupt();
    expect(router.tts.isCurrentlySpeaking()).toBe(false);
    expect(interrupted).toBe(true);
  });
});
