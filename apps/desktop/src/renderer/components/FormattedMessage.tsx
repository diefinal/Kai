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
      setCopied(false);
    }
  };

  return (
    <div className="kai-code-block glass-card">
      <div className="kai-code-header">
        <span className="kai-code-lang">{language || 'text'}</span>
        <button className="icon-btn" onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
};

export const ProgressCard: React.FC<{ title: string; progress: number }> = ({ title, progress }) => (
  <div className="glass-card kai-tool-card">
    <h4>{title}</h4>
    <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${progress}%` }}></div></div>
  </div>
);

export const FileCard: React.FC<{ filename: string; size: string }> = ({ filename, size }) => (
  <div className="glass-card kai-tool-card">
    <h4>📄 {filename}</h4><p className="stat-label">{size}</p>
  </div>
);

export const ToolCard: React.FC<{ tool: string; status: string }> = ({ tool, status }) => (
  <div className="glass-card kai-tool-card">
    <h4>🔧 {tool}</h4><p className={`stat-value ${status.toLowerCase()}`}>{status}</p>
  </div>
);

export const StatusCard: React.FC<{ status: string; detail: string }> = ({ status, detail }) => (
  <div className="glass-card kai-tool-card">
    <h4>{status}</h4><p className="stat-label">{detail}</p>
  </div>
);

export const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  if (content.includes('[PROGRESS]')) return <ProgressCard title="Scanning Files" progress={60} />;
  if (content.includes('[FILE]')) return <FileCard filename="architecture.md" size="14 KB" />;
  if (content.includes('[TOOL]')) return <ToolCard tool="Browser Engine" status="ACTIVE" />;
  if (content.includes('[STATUS]')) return <StatusCard status="System Update" detail="Downloading v1.0.1" />;

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="kai-formatted-message">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/^```(\w+)?\n([\s\S]*)```$/);
          if (match) {
            return <CodeBlock key={index} language={match[1]} code={match[2].trim()} />;
          }
        }
        return <p key={index}>{part}</p>;
      })}
    </div>
  );
};
