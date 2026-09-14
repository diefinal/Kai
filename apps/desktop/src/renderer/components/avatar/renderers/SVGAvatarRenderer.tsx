import React from 'react';
import { RendererProps } from './ImageAvatarRenderer';
import './SVGAvatar.css';

export const SVGAvatarRenderer: React.FC<RendererProps> = ({ state, theme, size }) => {
  // Translate theme to base colors
  const getThemeColors = () => {
    switch (theme) {
      case 'Light': return { primary: '#0ea5e9', bg: '#f1f5f9', glow: '#bae6fd' };
      case 'Dark': return { primary: '#3b82f6', bg: '#1e293b', glow: '#1d4ed8' };
      case 'Cyber Blue':
      default: return { primary: '#38bdf8', bg: '#0f172a', glow: '#0ea5e9' };
    }
  };

  const colors = getThemeColors();
  
  // State specific colors (override theme)
  let stateColor = colors.primary;
  let glowColor = colors.glow;
  
  switch(state) {
    case 'Thinking':
    case 'Working':
      stateColor = '#60A5FA';
      break;
    case 'Listening':
    case 'Reading Screen':
      stateColor = '#A78BFA';
      glowColor = '#8B5CF6';
      break;
    case 'Success':
      stateColor = '#34D399';
      glowColor = '#10B981';
      break;
    case 'Error':
      stateColor = '#F87171';
      glowColor = '#EF4444';
      break;
  }
  
  const stateClass = `avatar-state-${state.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div 
      className={`kai-living-avatar ${stateClass}`} 
      style={{ 
        width: size, 
        height: size,
        '--color-primary': stateColor,
        '--color-glow': glowColor,
        '--color-bg': colors.bg,
      } as React.CSSProperties}
    >
      <div className="kai-avatar-ambient-glow" />
      
      {/* Particles for thinking state */}
      {(state === 'Thinking' || state === 'Working') && (
         <div className="kai-particles-container">
            <div className="particle p1" />
            <div className="particle p2" />
            <div className="particle p3" />
         </div>
      )}

      <svg viewBox="0 0 200 200" className="kai-avatar-svg-face">
         <defs>
           <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
             <feGaussianBlur stdDeviation="4" result="blur" />
             <feComposite in="SourceGraphic" in2="blur" operator="over" />
           </filter>
           <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
             <stop offset="0%" stopColor="var(--color-primary)" />
             <stop offset="100%" stopColor="var(--color-glow)" />
           </linearGradient>
         </defs>

         {/* Pulse rings */}
         <circle cx="100" cy="100" r="90" className="avatar-pulse-ring" stroke="url(#ringGrad)" strokeWidth="2" fill="none" opacity="0" />
         <circle cx="100" cy="100" r="82" className="avatar-outer-ring" stroke="url(#ringGrad)" strokeWidth="3" strokeDasharray="40 20" fill="none" opacity="0" />
         
         {/* Head Core */}
         <circle cx="100" cy="100" r="74" fill="var(--color-bg)" stroke="var(--color-primary)" strokeWidth="3" filter="url(#glow-filter)" opacity="0.8" />
         
         <g className="avatar-face-group">
           {/* Left Eye */}
           <rect x="70" y="80" width="12" height="18" rx="6" className="avatar-eye left-eye" fill="var(--color-primary)" filter="url(#glow-filter)" />
           {/* Right Eye */}
           <rect x="118" y="80" width="12" height="18" rx="6" className="avatar-eye right-eye" fill="var(--color-primary)" filter="url(#glow-filter)" />
           
           {/* Mouth (Normal/Speaking) */}
           <rect x="85" y="125" width="30" height="4" rx="2" className="avatar-mouth" fill="var(--color-primary)" filter="url(#glow-filter)" />
           
           {/* Smile (Success) */}
           <path className="avatar-smile" d="M 80 120 Q 100 140 120 120" fill="none" stroke="var(--color-primary)" strokeWidth="5" strokeLinecap="round" filter="url(#glow-filter)" />
         </g>
      </svg>
    </div>
  );
};
