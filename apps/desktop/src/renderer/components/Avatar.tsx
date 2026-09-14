import React, { useMemo } from 'react';
import { AvatarState, AvatarConfig, defaultAvatarConfig } from './avatar/AvatarSystem';
import { SVGAvatarRenderer } from './avatar/renderers/SVGAvatarRenderer';
import { ImageAvatarRenderer } from './avatar/renderers/ImageAvatarRenderer';
import { LottieAvatarRenderer } from './avatar/renderers/LottieAvatarRenderer';

export type { AvatarState };

export interface AvatarProps {
  state: AvatarState;
  size?: number;
  config?: AvatarConfig;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  state, 
  size = 160, 
  config = defaultAvatarConfig 
}) => {
  // Translate legacy states to new states for backward compatibility
  const normalizedState = useMemo(() => {
    switch(state) {
      case 'Normal':
      case 'Sleeping': return 'Idle';
      case 'Working': return 'Thinking';
      case 'Reading Screen': return 'Listening';
      default: return state;
    }
  }, [state]);

  const renderContent = () => {
    const props = { state: normalizedState, size, theme: config.theme };
    
    // Support replaceable asset system without hardcoded paths
    if (config.assetUrls && config.assetUrls[normalizedState]) {
      const url = config.assetUrls[normalizedState];
      switch (config.assetType) {
        case 'image': return <ImageAvatarRenderer url={url} {...props} />;
        case 'lottie': return <LottieAvatarRenderer url={url} {...props} />;
        // Add more renderers as needed for VRM, Live2D, etc.
      }
    }
    
    // Default fallback to our built-in animated "Living Kai" AI character
    return <SVGAvatarRenderer {...props} />;
  };

  return (
    <div 
      data-testid="kai-avatar" 
      data-state={normalizedState}
      className={`kai-avatar-wrapper system-theme-${config.theme.replace(/\s+/g, '-').toLowerCase()}`} 
      style={{ width: size, height: size, position: 'relative' }}
    >
       {renderContent()}
    </div>
  );
};
