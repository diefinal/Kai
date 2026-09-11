import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from './types';
import { Avatar, type AvatarState } from './components/Avatar';
import { StatusPanel } from './components/StatusPanel';
import { WelcomeCard } from './components/WelcomeCard';
import { FormattedMessage } from './components/FormattedMessage';

export const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'initial-1',
      role: 'assistant',
      content: 'Welcome to Kai',
      createdAt: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<string>('');
  const [avatarState, setAvatarState] = useState<AvatarState>('Normal');
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

  const determineAvatarState = (cmd: string): AvatarState => {
    const lower = cmd.toLowerCase().trim();
    if (lower.includes('read screen') || lower.includes('ocr')) {
      return 'Reading Screen';
    }
    if (lower.includes('capture') || lower.includes('list')) {
      return 'Working';
    }
    return 'Thinking';
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

    const state = determineAvatarState(textToSend);
    setAvatarState(state);
    setStatus(state === 'Reading Screen' ? 'Reading Screen...' : 'Thinking...');

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInputText('');
    setLoading(true);

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
      setAvatarState('Success');
      setStatus('Completed');
      setTimeout(() => {
        setAvatarState('Normal');
        setStatus('');
      }, 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingId
            ? { ...msg, content: `Error: ${errorMsg}`, createdAt: Date.now() }
            : msg
        )
      );
      setAvatarState('Error');
      setStatus('Error Encountered');
      setTimeout(() => {
        setAvatarState('Normal');
        setStatus('');
      }, 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="kai-app-container">
      {/* LEFT PANEL: Avatar & Status */}
      <aside className="kai-left-panel" data-testid="kai-left-panel">
        <div className="kai-brand-badge">
          <span className="kai-brand-glow">⚡</span>
          <span className="kai-brand-title">Kai</span>
          <span className="kai-brand-version">v0.1.0</span>
        </div>

        <div className="kai-avatar-section">
          <Avatar state={avatarState} size={150} />
          <StatusPanel state={avatarState} customStatus={status} />
        </div>

        <div className="kai-panel-footer">
          <div className="kai-system-badge">
            <span className="kai-system-dot" />
            <span>Desktop Agent Engine</span>
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL: Conversation & Input */}
      <main className="kai-right-panel">
        <header className="kai-chat-topbar">
          <div className="kai-topbar-info">
            <h1 className="kai-topbar-title">Kai Assistant</h1>
            <span className="kai-topbar-mode">Desktop AI Control</span>
          </div>
        </header>

        <section className="kai-message-list" ref={messageListRef} id="kai-message-list">
          <WelcomeCard onQuickPrompt={(p) => handleSend(p)} />

          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isAssistant = msg.role === 'assistant';
            const roleClass = 'kai-message-' + msg.role;
            const authorLabel = isUser ? 'You' : isAssistant ? 'Kai' : 'System';

            return (
              <div
                key={msg.id}
                className={`kai-message-row ${roleClass}`}
                data-message-id={msg.id}
              >
                <div className="kai-message-bubble">
                  <div className="kai-message-header">
                    <span className="kai-message-author">{authorLabel}</span>
                    <span className="kai-message-time">{formatTimestamp(msg.createdAt)}</span>
                  </div>
                  <div className="kai-message-content">
                    {msg.content === 'Thinking...' ? (
                      <div className="kai-typing-indicator">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      <FormattedMessage content={msg.content} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <footer className="kai-message-input-bar">
          <div className="kai-input-container">
            <span className="kai-prompt-indicator">&gt;</span>
            <textarea
              ref={inputRef}
              className="kai-input"
              id="kai-input"
              placeholder="Kai'ye bir komut veya soru yazın (Enter ile gönder, Shift+Enter yeni satır)..."
              value={inputText}
              rows={1}
              disabled={loading}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="kai-send-button"
              id="kai-send-btn"
              disabled={loading || !inputText.trim()}
              onClick={() => handleSend()}
              type="button"
              title="Gönder"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
