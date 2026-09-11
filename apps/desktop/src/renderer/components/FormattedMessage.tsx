import React, { useState } from 'react';

export interface CodeBlockProps {
  language?: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <div className="kai-codeblock-wrapper">
      <div className="kai-codeblock-header">
        <span className="kai-codeblock-lang">{language || 'text'}</span>
        <button
          className="kai-codeblock-copy-btn"
          onClick={handleCopy}
          type="button"
          title="Kopyala"
        >
          {copied ? '✓ Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <pre className="kai-codeblock-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export interface FormattedMessageProps {
  content: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content }) => {
  // Regex to split code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = content.substring(lastIndex, match.index);
      parts.push(renderFormattedText(textChunk, `text-${lastIndex}`));
    }

    const lang = match[1] || '';
    const code = match[2] || '';
    parts.push(
      <CodeBlock key={`code-${match.index}`} language={lang} code={code.trimEnd()} />
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const textChunk = content.substring(lastIndex);
    parts.push(renderFormattedText(textChunk, `text-${lastIndex}`));
  }

  return <div className="kai-formatted-message">{parts}</div>;
};

function renderFormattedText(text: string, keyPrefix: string): React.ReactNode {
  const lines = text.split('\n');
  return (
    <div key={keyPrefix} className="kai-text-chunk">
      {lines.map((line, idx) => {
        // Bullet items
        const isBullet = line.trimStart().startsWith('•') || line.trimStart().startsWith('- ');
        const formattedLine = formatInlineMarkdown(line);

        return (
          <p
            key={`${keyPrefix}-line-${idx}`}
            className={isBullet ? 'kai-bullet-line' : 'kai-prose-line'}
          >
            {formattedLine}
          </p>
        );
      })}
    </div>
  );
}

function formatInlineMarkdown(text: string): React.ReactNode {
  // Simple bold **text** and inline code `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }
    const token = match[1];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(<code key={match.index} className="kai-inline-code">{token.slice(1, -1)}</code>);
    }
    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return parts.length > 0 ? parts : text;
}
