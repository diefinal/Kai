export interface VoiceConfig {
  voiceEnabled: boolean;
  wakeWordEnabled: boolean;
  pushToTalk: boolean;
  voiceSpeed: number;
  voiceVolume: number;
  language: 'tr-TR' | 'en-US';
}

export class VoiceSettings {
  private config: VoiceConfig;

  constructor(initialConfig?: Partial<VoiceConfig>) {
    this.config = {
      voiceEnabled: true,
      wakeWordEnabled: true,
      pushToTalk: false,
      voiceSpeed: 1.0,
      voiceVolume: 1.0,
      language: 'tr-TR',
      ...initialConfig
    };
  }

  public getConfig(): VoiceConfig {
    return { ...this.config };
  }

  public updateConfig(newSettings: Partial<VoiceConfig>): VoiceConfig {
    this.config = { ...this.config, ...newSettings };
    return this.getConfig();
  }
}
