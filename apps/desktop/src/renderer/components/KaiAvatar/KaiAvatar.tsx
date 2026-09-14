import React from 'react';
import './KaiAvatar.css';

export type KaiRuntimeState = 'idle' | 'listening' | 'thinking' | 'planning' | 'executing' | 'speaking' | 'completed' | 'error';

export interface KaiAvatarProps {
  state: KaiRuntimeState;
  size?: number;
}

export const KaiAvatar: React.FC<KaiAvatarProps> = ({ state, size = 160 }) => {
  return (
    <div className={`kai-core-container state-${state}`} style={{ width: size, height: size }}>
      <div className="kai-core-glow"></div>
      <div className="kai-core-ring ring-1"></div>
      <div className="kai-core-ring ring-2"></div>
      <div className="kai-core-ring ring-3"></div>
      <div className="kai-core-center">
        <div className="kai-core-inner"></div>
      </div>
      <div className="kai-core-particles">
        {/* Dynamic particles based on state could be added here, handled by CSS */}
        <div className="particle p-1"></div>
        <div className="particle p-2"></div>
        <div className="particle p-3"></div>
        <div className="particle p-4"></div>
      </div>
    </div>
  );
};
