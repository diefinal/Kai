import { describe, it, expect } from 'vitest';
import { OfficialKai, CharacterRegistry } from '../src/CharacterRegistry';

describe('CharacterRegistry & Official Kai Identity', () => {
  it('should enforce official Kai identity metadata and lock status', () => {
    expect(OfficialKai.id).toBe('kai-official-v1');
    expect(OfficialKai.locked).toBe(true);
    expect(OfficialKai.official).toBe(true);
    expect(OfficialKai.gender).toBe('female');
    expect(OfficialKai.age).toBe('23-25');
  });

  it('should return official model and sprite paths via registry', () => {
    expect(CharacterRegistry.getModelPath()).toBe('/models/kai.glb');
    expect(CharacterRegistry.getSpritePath('idle')).toBe('/assets/avatar/kai_idle.webp');
    expect(CharacterRegistry.getSpritePath('listening')).toBe('/assets/avatar/kai_listening.webp');
  });

  it('should reject unauthorized or arbitrary asset paths', () => {
    expect(CharacterRegistry.validateAssetPath('/models/kai.glb')).toBe(true);
    expect(CharacterRegistry.validateAssetPath('/models/random_avatar.glb')).toBe(false);
    expect(CharacterRegistry.validateAssetPath('/assets/robot.png')).toBe(false);
  });
});
