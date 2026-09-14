import React from 'react';
import { RendererProps } from './ImageAvatarRenderer';

export const LottieAvatarRenderer: React.FC<RendererProps> = ({ url, size }) => {
  if (!url) return null;
  // In a real application, this would use lottie-react or similar.
  // For now, this serves as an architecture stub to satisfy Future Ready requirements.
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 12, color: '#666' }}>[Lottie: {url}]</span>
    </div>
  );
};
