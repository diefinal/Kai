import { describe, it, expect, vi } from 'vitest';
import { ChatWindow } from '../src/renderer/components/ChatWindow';
import { MessageList } from '../src/renderer/components/MessageList';
import { MessageBubble } from '../src/renderer/components/MessageBubble';
import { MessageInput } from '../src/renderer/components/MessageInput';
import { StatusBar } from '../src/renderer/components/StatusBar';

describe('Chat Interface Components', () => {
  describe('MessageBubble', () => {
    it('renders user message correctly with timestamp and escaped content', () => {
      const bubble = new MessageBubble({
        id: 'msg-1',
        role: 'user',
        content: 'Hello <World> & Kai!',
        createdAt: 1700000000000,
      });

      const html = bubble.render();
      expect(html).toContain('kai-message-user');
      expect(html).toContain('You');
      expect(html).toContain('Hello &lt;World&gt; &amp; Kai!');
      expect(html).toContain('data-message-id="msg-1"');
    });

    it('renders assistant message with Kai label', () => {
      const bubble = new MessageBubble({
        id: 'msg-2',
        role: 'assistant',
        content: 'Welcome to Kai',
        createdAt: 1700000000000,
      });

      const html = bubble.render();
      expect(html).toContain('kai-message-assistant');
      expect(html).toContain('Kai');
      expect(html).toContain('Welcome to Kai');
    });
  });

  describe('MessageList & Auto-Scroll', () => {
    it('maintains message list and updates container', () => {
      const list = new MessageList([
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Initial message',
          createdAt: Date.now(),
        },
      ]);

      expect(list.getMessages()).toHaveLength(1);

      const fakeDom = {
        innerHTML: '',
        scrollTop: 0,
        scrollHeight: 500,
      };

      list.bindContainer(fakeDom);
      expect(fakeDom.innerHTML).toContain('Initial message');
      expect(fakeDom.scrollTop).toBe(500);

      fakeDom.scrollHeight = 800;
      list.addMessage({
        id: 'msg-2',
        role: 'user',
        content: 'Next message',
        createdAt: Date.now(),
      });

      expect(list.getMessages()).toHaveLength(2);
      expect(fakeDom.innerHTML).toContain('Next message');
      expect(fakeDom.scrollTop).toBe(800);
    });
  });

  describe('MessageInput', () => {
    it('submits on valid trimmed input and rejects empty / whitespace input', () => {
      const onSend = vi.fn();
      const input = new MessageInput({ onSend });

      expect(input.submit('')).toBe(false);
      expect(input.submit('   ')).toBe(false);
      expect(onSend).not.toHaveBeenCalled();

      expect(input.submit('Open Notepad')).toBe(true);
      expect(onSend).toHaveBeenCalledWith('Open Notepad');
    });

    it('handles Enter key to submit, ignores Shift+Enter', () => {
      const onSend = vi.fn();
      const input = new MessageInput({ onSend });

      const shiftEnterEvent = {
        key: 'Enter',
        shiftKey: true,
        preventDefault: vi.fn(),
      };
      expect(input.handleKeyDown(shiftEnterEvent, 'New line text')).toBe(false);
      expect(shiftEnterEvent.preventDefault).not.toHaveBeenCalled();
      expect(onSend).not.toHaveBeenCalled();

      const enterEvent = {
        key: 'Enter',
        shiftKey: false,
        preventDefault: vi.fn(),
      };
      expect(input.handleKeyDown(enterEvent, 'Execute command')).toBe(true);
      expect(enterEvent.preventDefault).toHaveBeenCalled();
      expect(onSend).toHaveBeenCalledWith('Execute command');
    });

    it('disables input and send button when disabled state is set', () => {
      const onSend = vi.fn();
      const input = new MessageInput({ onSend });

      input.setDisabled(true);
      expect(input.isDisabled()).toBe(true);
      expect(input.submit('Will not send')).toBe(false);
      expect(onSend).not.toHaveBeenCalled();

      const html = input.render();
      expect(html).toContain('disabled');
    });
  });

  describe('StatusBar', () => {
    it('renders title and status indicator badge', () => {
      const status = new StatusBar('Kai');
      expect(status.getTitle()).toBe('Kai');
      expect(status.render()).toContain('Kai');

      status.setStatus('Thinking...');
      expect(status.getStatus()).toBe('Thinking...');
      expect(status.render()).toContain('Thinking...');
      expect(status.render()).toContain('kai-status-badge');
    });
  });

  describe('ChatWindow Integration', () => {
    it('initializes with Welcome greeting and handles user message workflow', async () => {
      const chatWindow = new ChatWindow();
      const initialMessages = chatWindow.getMessageList().getMessages();

      expect(initialMessages).toHaveLength(1);
      expect(initialMessages[0].role).toBe('assistant');
      expect(initialMessages[0].content).toBe('Welcome to Kai');

      const sendPromise = chatWindow.handleSendMessage('Hello Kai');

      // Right after sending, user message and temporary thinking message exist
      const midMessages = chatWindow.getMessageList().getMessages();
      expect(midMessages).toHaveLength(3);
      expect(midMessages[1].role).toBe('user');
      expect(midMessages[1].content).toBe('Hello Kai');
      expect(midMessages[2].role).toBe('assistant');
      expect(midMessages[2].content).toBe('Thinking...');
      expect(chatWindow.getStatusBar().getStatus()).toBe('Thinking...');

      await sendPromise;

      // After completion, thinking message is replaced by "Command received."
      const finalMessages = chatWindow.getMessageList().getMessages();
      expect(finalMessages).toHaveLength(3);
      expect(finalMessages[2].role).toBe('assistant');
      expect(finalMessages[2].content).toBe('Command received.');
      expect(chatWindow.getStatusBar().getStatus()).toBe('');
      expect(chatWindow.getMessageInput().isDisabled()).toBe(false);
    });

    it('renders complete chat window structure', () => {
      const chatWindow = new ChatWindow();
      const html = chatWindow.render();

      expect(html).toContain('kai-chat-window');
      expect(html).toContain('kai-status-bar');
      expect(html).toContain('kai-message-list');
      expect(html).toContain('kai-message-input-bar');
      expect(html).toContain('Welcome to Kai');
    });
  });
});

