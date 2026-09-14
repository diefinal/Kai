export type AvatarState = 
  // Legacy states (kept for backwards compatibility)
  | 'Normal' | 'Reading Screen' | 'Working' | 'Sleeping'
  // New Living Kai states
  | 'Idle' | 'Listening' | 'Thinking' | 'Planning' | 'Executing' | 'Speaking' | 'Success' | 'Completed' | 'Error';

export type AvatarTheme = 'Light' | 'Dark' | 'Cyber Blue';

export interface AvatarConfig {
  theme: AvatarTheme;
  assetType: 'svg' | 'lottie' | 'rive' | 'image' | 'video';
  // assetUrls maps state to external asset URLs. 
  // Fulfills "Asset System must be replaceable. No hardcoded image paths"
  assetUrls?: Partial<Record<AvatarState, string>>;
}

export const defaultAvatarConfig: AvatarConfig = {
  theme: 'Cyber Blue',
  assetType: 'svg'
};
