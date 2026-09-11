import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Avatar, AvatarState } from '../src/renderer/components/Avatar';
import { StatusPanel } from '../src/renderer/components/StatusPanel';
import { WelcomeCard } from '../src/renderer/components/WelcomeCard';
import { FormattedMessage, CodeBlock } from '../src/renderer/components/FormattedMessage';
import { App } from '../src/renderer/App';

describe('UI-001 Kai Experience & Avatar Integration', () => {
  describe('Avatar Component', () => {
    const states: AvatarState[] = [
      'Normal',
      'Thinking',
      'Reading Screen',
      'Listening',
      'Working',
      'Success',
      'Error',
      'Sleeping',
    ];

    states.forEach((st) => {
      it(`renders avatar correctly in ${st} state`, () => {
        const html = renderToString(React.createElement(Avatar, { state: st }));
        expect(html).toContain('kai-avatar-wrapper');
        expect(html).toContain(`data-state="${st}"`);
        expect(html).toContain('kai-avatar-svg');
      });
    });

    it('renders scanner element when Reading Screen', () => {
      const html = renderToString(React.createElement(Avatar, { state: 'Reading Screen' }));
      expect(html).toContain('kai-avatar-scanner');
    });

    it('renders sleep z indicators when Sleeping', () => {
      const html = renderToString(React.createElement(Avatar, { state: 'Sleeping' }));
      expect(html).toContain('>z<');
    });
  });

  describe('StatusPanel Component', () => {
    it('displays default ready status for Normal state', () => {
      const html = renderToString(React.createElement(StatusPanel, { state: 'Normal' }));
      expect(html).toContain('● Ready');
    });

    it('displays Thinking status for Thinking state', () => {
      const html = renderToString(React.createElement(StatusPanel, { state: 'Thinking' }));
      expect(html).toContain('Thinking...');
    });

    it('displays Reading Screen status for Reading Screen state', () => {
      const html = renderToString(React.createElement(StatusPanel, { state: 'Reading Screen' }));
      expect(html).toContain('Reading Screen...');
    });

    it('displays custom status override when provided', () => {
      const html = renderToString(
        React.createElement(StatusPanel, { state: 'Normal', customStatus: 'Processing OCR' })
      );
      expect(html).toContain('Processing OCR');
    });
  });

  describe('WelcomeCard Component', () => {
    it('renders greeting in Turkish as specified in requirements', () => {
      const html = renderToString(React.createElement(WelcomeCard));
      expect(html).toContain('Merhaba Özgür 👋');
      expect(html).toContain('Ben Kai. Bilgisayarında çalışan yapay zekâ asistanınım.');
      expect(html).toContain('Sana bugün nasıl yardımcı olabilirim?');
      expect(html).toContain('Açık Pencereleri Listele');
      expect(html).toContain('Ekranı Oku (OCR)');
    });
  });

  describe('FormattedMessage & CodeBlock Components', () => {
    it('renders code block with language and copy button', () => {
      const html = renderToString(
        React.createElement(CodeBlock, { language: 'typescript', code: 'const x = 10;' })
      );
      expect(html).toContain('typescript');
      expect(html).toContain('const x = 10;');
      expect(html).toContain('Kopyala');
    });

    it('renders markdown code blocks within formatted messages', () => {
      const content = 'Here is code:\n```javascript\nconsole.log("Kai");\n```\nDone.';
      const html = renderToString(React.createElement(FormattedMessage, { content }));
      expect(html).toContain('javascript');
      expect(html).toContain('console.log(&quot;Kai&quot;);');
      expect(html).toContain('Done.');
    });

    it('renders bullet lists with bullet class', () => {
      const content = 'Available Commands\n• Help\n• List Windows';
      const html = renderToString(React.createElement(FormattedMessage, { content }));
      expect(html).toContain('kai-bullet-line');
      expect(html).toContain('Help');
      expect(html).toContain('List Windows');
    });
  });

  describe('App Component Layout', () => {
    it('renders two-panel desktop structure with persistent left avatar panel', () => {
      const html = renderToString(React.createElement(App));
      expect(html).toContain('kai-app-container');
      expect(html).toContain('kai-left-panel');
      expect(html).toContain('kai-right-panel');
      expect(html).toContain('kai-avatar-wrapper');
      expect(html).toContain('kai-welcome-card');
      expect(html).toContain('kai-message-input-bar');
    });
  });
});
