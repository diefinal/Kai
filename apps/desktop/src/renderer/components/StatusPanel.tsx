import React from 'react';
import type { AvatarState } from './Avatar';

export interface StatusPanelProps {
  state: AvatarState;
  customStatus?: string;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ state, customStatus }) => {
  const getStatusDisplay = () => {
    if (customStatus) {
      return { text: customStatus, color: '#60A5FA', dotClass: 'pulsing' };
    }

    switch (state) {
      case 'Thinking':
        return { text: 'Thinking...', color: '#60A5FA', dotClass: 'pulsing' };
      case 'Reading Screen':
        return { text: 'Reading Screen...', color: '#38BDF8', dotClass: 'scanning' };
      case 'Working':
        return { text: 'Executing...', color: '#60A5FA', dotClass: 'pulsing' };
      case 'Listening':
        return { text: 'Listening...', color: '#A78BFA', dotClass: 'pulsing' };
      case 'Success':
        return { text: 'Completed', color: '#34D399', dotClass: 'solid' };
      case 'Error':
        return { text: 'Error Encountered', color: '#F87171', dotClass: 'solid' };
      case 'Sleeping':
        return { text: 'Sleeping', color: '#64748B', dotClass: 'dim' };
      case 'Normal':
      default:
        return { text: '● Ready', color: '#10B981', dotClass: 'ready' };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="kai-status-panel" data-testid="kai-status-panel">
      <div className="kai-status-pill">
        <span
          className={`kai-status-dot ${status.dotClass}`}
          style={{ backgroundColor: status.color }}
        />
        <span className="kai-status-text" style={{ color: status.color }}>
          {status.text}
        </span>
      </div>
    </div>
  );
};
