import React from 'react';
import { AvatarState, AvatarTheme } from '../AvatarSystem';

export interface RendererProps {
  state: AvatarState;
  theme: AvatarTheme;
  size: number;
  url?: string;
}

export const ImageAvatarRenderer: React.FC<RendererProps> = ({ url, size }) => {
  if (!url) return null;
  return (
    <img 
      src={url} 
      alt="Kai Avatar" 
      style={{ width: size, height: size, objectFit: 'contain' }} 
    />
  );
};
