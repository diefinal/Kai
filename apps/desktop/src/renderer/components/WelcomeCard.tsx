import React from 'react';

export interface WelcomeCardProps {
  onQuickPrompt?: (prompt: string) => void;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({ onQuickPrompt }) => {
  return (
    <div className="kai-welcome-card" data-testid="kai-welcome-card">
      <div className="kai-welcome-header">
        <h2 className="kai-welcome-title">Merhaba Özgür 👋</h2>
        <p className="kai-welcome-subtitle">Ben Kai. Bilgisayarında çalışan yapay zekâ asistanınım.</p>
      </div>

      <div className="kai-welcome-body">
        <p className="kai-welcome-prompt">Sana bugün nasıl yardımcı olabilirim?</p>
        <div className="kai-quick-actions">
          <button
            className="kai-quick-btn"
            onClick={() => onQuickPrompt?.('list windows')}
            type="button"
          >
            <span className="kai-quick-icon">🪟</span>
            <span>Açık Pencereleri Listele</span>
          </button>
          <button
            className="kai-quick-btn"
            onClick={() => onQuickPrompt?.('read screen')}
            type="button"
          >
            <span className="kai-quick-icon">👁️</span>
            <span>Ekranı Oku (OCR)</span>
          </button>
          <button
            className="kai-quick-btn"
            onClick={() => onQuickPrompt?.('capture screen')}
            type="button"
          >
            <span className="kai-quick-icon">📸</span>
            <span>Ekran Görüntüsü Al</span>
          </button>
          <button
            className="kai-quick-btn"
            onClick={() => onQuickPrompt?.('help')}
            type="button"
          >
            <span className="kai-quick-icon">💡</span>
            <span>Komut Listesi (Help)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
