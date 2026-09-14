export interface VisemeFrame {
  timeMs: number;
  mouthOpen: number; // 0.0 to 1.0
  mouthWide: number; // 0.0 to 1.0
}

export class LipSyncEngine {
  public generateLipSync(text: string, totalDurationMs: number): VisemeFrame[] {
    const frames: VisemeFrame[] = [];
    const step = 50; // 20 FPS sync frames
    const totalFrames = Math.floor(totalDurationMs / step);

    for (let i = 0; i < totalFrames; i++) {
      const timeMs = i * step;
      // Procedural natural sine wave envelope with vowels emphasis
      const wave = Math.sin((i / 2) * Math.PI) * 0.5 + 0.5;
      frames.push({
        timeMs,
        mouthOpen: Math.min(1.0, wave * 0.8),
        mouthWide: (i % 4 === 0) ? 0.6 : 0.3
      });
    }
    return frames;
  }
}
