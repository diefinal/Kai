import React from 'react';
import './KaiAvatar.css';

import IdleAvatar from '../../assets/avatar/kai-idle.webp';
import ListeningAvatar from '../../assets/avatar/kai-listening.webp';
import ThinkingAvatar from '../../assets/avatar/kai-thinking.webp';
import SpeakingAvatar from '../../assets/avatar/kai-speaking.webp';
import ErrorAvatar from '../../assets/avatar/kai-error.webp';

export type KaiRuntimeState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error' | 'Normal' | 'Reading Screen' | 'Working' | 'Sleeping' | 'Success' | 'Planning' | 'Executing' | 'Completed';

export interface KaiAvatarProps {
  state: KaiRuntimeState;
  size?: number;
}

export const KaiAvatar: React.FC<KaiAvatarProps> = ({ state, size = 150 }) => {
  let imgSrc = IdleAvatar;
  let stateClass = '';

  const normalizedState = state.toLowerCase();

  if (normalizedState.includes('error')) {
    imgSrc = ErrorAvatar;
    stateClass = 'kai-avatar-error';
  } else if (normalizedState.includes('listen') || normalizedState.includes('read')) {
    imgSrc = ListeningAvatar;
    stateClass = 'kai-avatar-listening';
  } else if (normalizedState.includes('think') || normalizedState.includes('plan') || normalizedState.includes('work') || normalizedState.includes('execut')) {
    imgSrc = ThinkingAvatar;
    stateClass = 'kai-avatar-thinking';
  } else if (normalizedState.includes('speak')) {
    imgSrc = SpeakingAvatar;
    stateClass = 'kai-avatar-speaking';
  } else {
    imgSrc = IdleAvatar;
    stateClass = 'kai-avatar-idle';
  }

  return (
    <div className={\kai-official-avatar \\} style={{ width: size, height: size }}>
      <img src={imgSrc} alt={\Kai Avatar (\)\} />
    </div>
  );
};
