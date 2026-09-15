/**
 * KaiAvatar Component (2D Sprite View)
 *
 * Mandatory Reference: /docs/KAI_IDENTITY.md
 * Kai Identity is frozen and locked.
 * All avatar renders must display the official Kai character.
 * Redesign, replacement, fallback characters, or arbitrary generated avatars are strictly forbidden.
 */

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

  if (!imgSrc) {
    return (
      <div className="kai-avatar-missing" style={{ width: size, height: size, color: '#38bdf8', textAlign: 'center' }}>
        Official Kai asset missing.
      </div>
    );
  }

  return (
    <div className={`kai-avatar-wrapper state-${state}`} style={{ width: size, height: size }}>
      <div className="kai-avatar-glow-layer"></div>
      <div className="kai-avatar-image-container">
        <img src={imgSrc} alt={`Official Kai (${state})`} className="kai-avatar-img" />
      </div>
      <div className="kai-avatar-effects"></div>
    </div>
  );
};
