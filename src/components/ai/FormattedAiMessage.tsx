import React from 'react';

interface FormattedAiMessageProps {
  text: string;
  isUser?: boolean;
}

function renderInlineFormatting(line: string, isUser: boolean): React.ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|_[^_\n]+_|\*[^*\n]+\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      parts.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      parts.push(
        <code
          key={`c-${keyIdx++}`}
          className={`px-1.5 py-0.5 rounded text-[0.85em] font-mono ${
            isUser
              ? 'bg-emerald-800/60 text-emerald-50'
              : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (
      ((token.startsWith('_') && token.endsWith('_')) ||
        (token.startsWith('*') && token.endsWith('*'))) &&
      token.length > 2
    ) {
      parts.push(
        <em
          key={`i-${keyIdx++}`}
          className={isUser ? 'italic text-emerald-50' : 'italic text-slate-600 dark:text-slate-300'}
        >
          {token.slice(1, -1)}
        </em>
      );
    } else {
      parts.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts;
}

export function FormattedAiMessage({ text, isUser = false }: FormattedAiMessageProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{text}</div>;
  }

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let bulletItems: string[] = [];
  let orderedItems: string[] = [];
  let blockKey = 0;

  const flushLists = () => {
    if (bulletItems.length > 0) {
      blocks.push(
        <ul key={`ul-${blockKey++}`} className="list-disc pl-5 space-y-1">
          {bulletItems.map((item, idx) => (
            <li key={idx}>{renderInlineFormatting(item, false)}</li>
          ))}
        </ul>
      );
      bulletItems = [];
    }
    if (orderedItems.length > 0) {
      blocks.push(
        <ol key={`ol-${blockKey++}`} className="list-decimal pl-5 space-y-1">
          {orderedItems.map((item, idx) => (
            <li key={idx}>{renderInlineFormatting(item, false)}</li>
          ))}
        </ol>
      );
      orderedItems = [];
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushLists();
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushLists();
      blocks.push(
        <hr key={`hr-${blockKey++}`} className="border-slate-200 dark:border-slate-700 my-1.5" />
      );
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      flushLists();
      blocks.push(
        <h5
          key={`h5-${blockKey++}`}
          className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200 pt-1"
        >
          {renderInlineFormatting(trimmed.slice(5), false)}
        </h5>
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushLists();
      blocks.push(
        <h4
          key={`h4-${blockKey++}`}
          className="text-sm font-bold text-slate-900 dark:text-white pt-1"
        >
          {renderInlineFormatting(trimmed.slice(4), false)}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushLists();
      blocks.push(
        <h3
          key={`h3-${blockKey++}`}
          className="text-[15px] font-bold text-slate-900 dark:text-white pt-1"
        >
          {renderInlineFormatting(trimmed.slice(3), false)}
        </h3>
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (orderedItems.length > 0) flushLists();
      const cleaned = trimmed
        .replace(/^[-*]\s+/, '')
        .replace(/^\[\s*\]\s*/, '☐ ')
        .replace(/^\[[xX]\]\s*/, '☑ ');
      bulletItems.push(cleaned);
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      if (bulletItems.length > 0) flushLists();
      orderedItems.push(trimmed.replace(/^\d+[.)]\s+/, ''));
      continue;
    }

    flushLists();
    blocks.push(
      <p key={`p-${blockKey++}`}>{renderInlineFormatting(trimmed, false)}</p>
    );
  }

  flushLists();

  return <div className="space-y-2">{blocks}</div>;
}
