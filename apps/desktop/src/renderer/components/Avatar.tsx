import React from 'react';

export type AvatarState =
  | 'Normal'
  | 'Thinking'
  | 'Reading Screen'
  | 'Listening'
  | 'Working'
  | 'Success'
  | 'Error'
  | 'Sleeping';

export interface AvatarProps {
  state: AvatarState;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ state, size = 160 }) => {
  const getStateColor = (s: AvatarState) => {
    switch (s) {
      case 'Thinking':
      case 'Working':
        return '#60A5FA';
      case 'Reading Screen':
        return '#38BDF8';
      case 'Listening':
        return '#A78BFA';
      case 'Success':
        return '#34D399';
      case 'Error':
        return '#F87171';
      case 'Sleeping':
        return '#64748B';
      case 'Normal':
      default:
        return '#3B82F6';
    }
  };

  const currentColor = getStateColor(state);

  return (
    <div
      className={`kai-avatar-wrapper state-${state.toLowerCase().replace(/\s+/g, '-')}`}
      style={{ width: size, height: size }}
      data-testid="kai-avatar"
      data-state={state}
    >
      <div className="kai-avatar-glow" style={{ boxShadow: `0 0 35px ${currentColor}55` }} />
      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="kai-avatar-svg"
      >
        <defs>
          <linearGradient id="kaiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="kaiRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={currentColor} />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Orbit / Pulse Ring */}
        <circle
          cx="80"
          cy="80"
          r="72"
          stroke="url(#kaiRingGradient)"
          strokeWidth="3"
          strokeDasharray={state === 'Thinking' || state === 'Working' ? '12 8' : 'none'}
          className={`kai-avatar-outer-ring ${state === 'Thinking' || state === 'Working' ? 'spin-ring' : ''}`}
          opacity="0.85"
        />

        {/* Head Core */}
        <circle
          cx="80"
          cy="80"
          r="62"
          fill="url(#kaiGradient)"
          stroke={currentColor}
          strokeWidth="2"
        />

        {/* Expressive Eyes & Elements based on state */}
        {state === 'Sleeping' ? (
          <g stroke={currentColor} strokeWidth="3" strokeLinecap="round" opacity="0.6">
            <path d="M 52 78 Q 62 84 72 78" fill="none" />
            <path d="M 88 78 Q 98 84 108 78" fill="none" />
            <text x="115" y="55" fill={currentColor} fontSize="14" fontFamily="monospace">z</text>
            <text x="125" y="45" fill={currentColor} fontSize="10" fontFamily="monospace">z</text>
          </g>
        ) : state === 'Reading Screen' ? (
          <g>
            {/* Wide scanning eyes */}
            <circle cx="60" cy="74" r="8" fill={currentColor} filter="url(#glow)" />
            <circle cx="100" cy="74" r="8" fill={currentColor} filter="url(#glow)" />
            <rect
              x="45"
              y="90"
              width="70"
              height="3"
              rx="1.5"
              fill={currentColor}
              className="kai-avatar-scanner"
            />
          </g>
        ) : state === 'Thinking' ? (
          <g>
            {/* Pulsing thinking eyes */}
            <circle cx="60" cy="74" r="7" fill={currentColor} className="kai-avatar-pulse-eye" />
            <circle cx="100" cy="74" r="7" fill={currentColor} className="kai-avatar-pulse-eye" />
            {/* Thinking arcs */}
            <path
              d="M 50 56 Q 60 50 70 56"
              stroke={currentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 90 56 Q 100 50 110 56"
              stroke={currentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="80" cy="98" r="4" fill={currentColor} opacity="0.8" />
          </g>
        ) : state === 'Error' ? (
          <g stroke={currentColor} strokeWidth="3.5" strokeLinecap="round">
            {/* Cross eyes */}
            <line x1="53" y1="68" x2="67" y2="82" />
            <line x1="67" y1="68" x2="53" y2="82" />
            <line x1="93" y1="68" x2="107" y2="82" />
            <line x1="107" y1="68" x2="93" y2="82" />
            <path d="M 62 102 Q 80 94 98 102" fill="none" strokeWidth="3" />
          </g>
        ) : state === 'Success' ? (
          <g stroke={currentColor} strokeWidth="3.5" strokeLinecap="round">
            {/* Happy arch eyes */}
            <path d="M 52 76 Q 62 66 72 76" fill="none" />
            <path d="M 88 76 Q 98 66 108 76" fill="none" />
            <path d="M 64 96 Q 80 110 96 96" fill="none" strokeWidth="3" />
          </g>
        ) : state === 'Listening' ? (
          <g>
            <circle cx="60" cy="74" r="9" fill={currentColor} filter="url(#glow)" />
            <circle cx="100" cy="74" r="9" fill={currentColor} filter="url(#glow)" />
            {/* Sound waves on sides */}
            <path
              d="M 28 72 Q 22 80 28 88"
              stroke={currentColor}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 132 72 Q 138 80 132 88"
              stroke={currentColor}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path d="M 72 96 Q 80 100 88 96" stroke={currentColor} strokeWidth="2.5" fill="none" />
          </g>
        ) : (
          <g>
            {/* Normal / Default friendly expressive face */}
            <circle cx="60" cy="75" r="7" fill={currentColor} filter="url(#glow)" />
            <circle cx="100" cy="75" r="7" fill={currentColor} filter="url(#glow)" />
            <circle cx="62" cy="73" r="2.5" fill="#FFFFFF" />
            <circle cx="102" cy="73" r="2.5" fill="#FFFFFF" />
            <path
              d="M 68 96 Q 80 104 92 96"
              stroke={currentColor}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
