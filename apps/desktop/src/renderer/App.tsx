import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from './types';
import { KaiAvatar, KaiRuntimeState } from './components/KaiAvatar';
import { FormattedMessage } from './components/FormattedMessage';
import './styles.css';

export const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<string>('Ready');
  const [avatarState, setAvatarState] = useState<KaiRuntimeState>('idle');
  const [loading, setLoading] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const determineAvatarState = (cmd: string): KaiRuntimeState => {
    const lower = cmd.toLowerCase().trim();
    if (lower.includes('read screen') || lower.includes('ocr')) {
      return 'listening';
    }
    if (lower.includes('capture') || lower.includes('list')) {
      return 'executing';
    }
    return 'thinking';
  };

  const handleSend = async (customCommand?: string) => {
    const textToSend = (customCommand ?? inputText).trim();
    if (!textToSend || loading) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: textToSend,
      createdAt: Date.now(),
    };

    const thinkingId = 'thinking-' + Date.now();
    const thinkingMessage: ChatMessage = {
      id: thinkingId,
      role: 'assistant',
      content: 'Thinking...',
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInputText('');
    setLoading(true);

    // Timeline Simulation
    setAvatarState('listening');
    setStatus('Listening...');

    setTimeout(() => {
      setAvatarState('planning');
      setStatus('Planning...');

      setTimeout(async () => {
        setAvatarState('executing');
        setStatus('Executing...');

        try {
          let responseText = 'Command received.';
          if (typeof window !== 'undefined' && window.kai && window.kai.executeCommand) {
            responseText = await window.kai.executeCommand(textToSend);
          } else {
            const { CommandDispatcher } = await import('../core/CommandDispatcher');
            const dispatcher = new CommandDispatcher();
            responseText = await dispatcher.dispatch(textToSend);
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === thinkingId
                ? { ...msg, content: responseText, createdAt: Date.now() }
                : msg
            )
          );

          setAvatarState('speaking');
          setStatus('Speaking...');

          setTimeout(() => {
            setAvatarState('completed');
            setStatus('Completed');
            setTimeout(() => {
              setAvatarState('idle');
              setStatus('Ready');
            }, 3000);
          }, 2000);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === thinkingId
                ? { ...msg, content: `Error: ${errorMsg}`, createdAt: Date.now() }
                : msg
            )
          );
          setAvatarState('error');
          setStatus('Error Encountered');
          setTimeout(() => {
            setAvatarState('idle');
            setStatus('Ready');
          }, 4000);
        } finally {
          setLoading(false);
        }
      }, 500);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const statusColors: Record<string, string> = {
    'idle': '🟢',
    'listening': '👂',
    'thinking': '🧠',
    'planning': '🧠',
    'executing': '⚡',
    'speaking': '🗣',
    'completed': '✅',
    'error': '🔴'
  };

  return (
    <div className="kai-app-container glass-theme">
      {/* LEFT PANEL */}
      <div className="kai-left-panel glass-panel">
        <div className="kai-panel-header">
          <h2>Kai <span className="version">(v1.0)</span></h2>
        </div>
        <div className="kai-divider" />
        
        <div className="kai-avatar-section">
          <KaiAvatar state={avatarState} size={150} />
        </div>
        
        <div className="kai-divider" />
        
        <div className="kai-status-indicator">
           {statusColors[avatarState] || '🟢'} {status}
        </div>

        <div className="kai-divider" />
        
        <div className="kai-stats-grid">
          <div className="stat-item"><span className="stat-label">CPU</span><span className="stat-value">12%</span></div>
          <div className="stat-item"><span className="stat-label">Memory</span><span className="stat-value">4.2GB</span></div>
          <div className="stat-item"><span className="stat-label">Vision</span><span className="stat-value active">ON</span></div>
          <div className="stat-item"><span className="stat-label">Browser</span><span className="stat-value standby">STANDBY</span></div>
          <div className="stat-item"><span className="stat-label">Voice</span><span className="stat-value active">READY</span></div>
        </div>

        <div className="kai-divider" />

        <div className="kai-panel-footer">
          Desktop Agent Engine
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="kai-main-area">
        <div className="kai-chat-messages" ref={messageListRef}>
          {messages.length === 0 ? (
            <div className="kai-welcome-wrapper">
              <div className="glass-card welcome-card">
                <h2>Merhaba Özgür 👋</h2>
                <p>Bugün;</p>
                <ul>
                  <li>• 2 toplantın var</li>
                  <li>• GitHub'da 1 PR bekliyor</li>
                  <li>• Asana'da 4 görev açık</li>
                </ul>
                <p className="welcome-prompt">Bugün ne yapmak istersin?</p>
              </div>
              
              <div className="quick-actions-grid">
                {['VS Code', 'GitHub', 'MongoDB', '360Restoran', 'Asana', 'Outlook'].map(action => (
                  <button key={action} className="glass-button quick-action-btn" onClick={() => handleSend(`${action} aç`)}>
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`kai-message ${msg.role}`}>
                <div className="kai-message-bubble glass-card">
                   <FormattedMessage content={msg.content} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="kai-input-area glass-panel">
          <textarea
            ref={inputRef}
            className="kai-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Bir mesaj yazın..."
            rows={1}
          />
          <div className="kai-input-actions">
            <button className="icon-btn" title="Voice (Ready)">🎤</button>
            <button className="icon-btn" title="Attach">📎</button>
            <button className="icon-btn" title="Screenshot">📷</button>
            <button className="icon-btn" title="Keyboard">⌨</button>
            <button 
              className="icon-btn send-btn" 
              onClick={() => handleSend()}
              disabled={loading || !inputText.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
