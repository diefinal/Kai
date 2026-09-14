import React, { useMemo } from 'react';
import './KaiAvatar.css';
import type { KaiAvatarState } from './KaiAvatarState';

import IdleImg from '../../assets/avatar/kai_idle.webp';
import ListeningImg from '../../assets/avatar/kai_listening.webp';
import ThinkingImg from '../../assets/avatar/kai_thinking.webp';
import SpeakingImg from '../../assets/avatar/kai_speaking.webp';
import SuccessImg from '../../assets/avatar/kai_success.webp';
import ErrorImg from '../../assets/avatar/kai_error.webp';

export interface KaiAvatarProps {
  state: KaiAvatarState;
  size?: number;
}

export const KaiAvatar: React.FC<KaiAvatarProps> = ({ state, size = 160 }) => {
  const imgSrc = useMemo(() => {
    switch (state) {
      case 'listening': return ListeningImg;
      case 'thinking':
      case 'planning': return ThinkingImg;
      case 'speaking':
      case 'executing': return SpeakingImg;
      case 'completed': return SuccessImg;
      case 'error': return ErrorImg;
      case 'idle':
      default: return IdleImg;
    }
  }, [state]);

  return (
    <div className={`kai-avatar-wrapper state-${state}`} style={{ width: size, height: size }}>
      <div className="kai-avatar-glow-layer"></div>
      <div className="kai-avatar-image-container">
        <img src={imgSrc} alt={`Kai (${state})`} className="kai-avatar-img" />
      </div>
      {/* Overlay particles/effects */}
      <div className="kai-avatar-effects"></div>
    </div>
  );
};
