/**
 * Character Registry for Kai Ecosystem
 *
 * Mandatory Reference: /docs/KAI_IDENTITY.md
 * Kai Identity is frozen and locked. Redesign, replacement, or arbitrary avatars are strictly forbidden.
 */

export interface CharacterProfile {
  id: string;
  name: string;
  locked: boolean;
  official: boolean;
  version: string;
  gender: 'female';
  age: '23-25';
  style: 'minimal-futuristic-human';
  assetPaths: {
    model3d: string;
    preview: string;
    sprites: {
      idle: string;
      listening: string;
      thinking: string;
      speaking: string;
      success: string;
      error: string;
    };
  };
}

export const OfficialKai: CharacterProfile = {
  id: 'kai-official-v1',
  name: 'Kai',
  locked: true,
  official: true,
  version: '1.0',
  gender: 'female',
  age: '23-25',
  style: 'minimal-futuristic-human',
  assetPaths: {
    model3d: '/models/kai.glb',
    preview: '/models/preview.png',
    sprites: {
      idle: '/assets/avatar/kai_idle.webp',
      listening: '/assets/avatar/kai_listening.webp',
      thinking: '/assets/avatar/kai_thinking.webp',
      speaking: '/assets/avatar/kai_speaking.webp',
      success: '/assets/avatar/kai_success.webp',
      error: '/assets/avatar/kai_error.webp'
    }
  }
};

export class CharacterRegistry {
  private static officialCharacter: CharacterProfile = OfficialKai;

  public static getOfficialCharacter(): CharacterProfile {
    return this.officialCharacter;
  }

  public static getModelPath(): string {
    return this.officialCharacter.assetPaths.model3d;
  }

  public static getSpritePath(state: keyof CharacterProfile['assetPaths']['sprites']): string {
    return this.officialCharacter.assetPaths.sprites[state] || this.officialCharacter.assetPaths.sprites.idle;
  }

  public static validateAssetPath(path: string): boolean {
    // Only official Kai assets are permitted
    return (
      path === this.officialCharacter.assetPaths.model3d ||
      Object.values(this.officialCharacter.assetPaths.sprites).includes(path)
    );
  }
}
