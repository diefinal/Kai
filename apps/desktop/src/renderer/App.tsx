import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from './types';

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
  const [loading, setLoading] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: trimmed,
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
    setStatus('Thinking...');

    try {
      let responseText = 'Command received.';
      if (typeof window !== 'undefined' && window.kai && window.kai.executeCommand) {
        responseText = await window.kai.executeCommand(trimmed);
      } else {
        const { CommandDispatcher } = await import('../core/CommandDispatcher');
        const dispatcher = new CommandDispatcher();
        responseText = await dispatcher.dispatch(trimmed);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingId
            ? { ...msg, content: responseText, createdAt: Date.now() }
            : msg
        )
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === thinkingId
            ? { ...msg, content: `Error: ${errorMsg}`, createdAt: Date.now() }
            : msg
        )
      );
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    <div className="kai-chat-window">
      <header className="kai-status-bar">
        <div className="kai-status-title">Kai</div>
        <div className="kai-status-indicator">
          {status && <span className="kai-status-badge">{status}</span>}
        </div>
      </header>

      <main className="kai-message-list" ref={messageListRef} id="kai-message-list">
        {messages.map((msg) => {
          const roleClass = 'kai-message-' + msg.role;
          const authorLabel =
            msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Kai' : 'System';

          return (
            <div key={msg.id} className={`kai-message-row ${roleClass}`} data-message-id={msg.id}>
              <div className="kai-message-bubble">
                <div className="kai-message-header">
                  <span className="kai-message-author">{authorLabel}</span>
                  <span className="kai-message-time">{formatTimestamp(msg.createdAt)}</span>
                </div>
                <div className="kai-message-content">{msg.content}</div>
              </div>
            </div>
          );
        })}
      </main>

      <footer className="kai-message-input-bar">
        <span className="kai-prompt-indicator">&gt;</span>
        <input
          type="text"
          className="kai-input"
          id="kai-input"
          placeholder="Type a message..."
          value={inputText}
          disabled={loading}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="kai-send-button"
          id="kai-send-btn"
          disabled={loading || !inputText.trim()}
          onClick={handleSend}
        >
          ▶
        </button>
      </footer>
    </div>
  );
};

export default App;

