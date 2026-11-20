import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface CopyResponseButtonProps {
  text: string;
  className?: string;
}

export function CopyResponseButton({ text, className = '' }: CopyResponseButtonProps) {
  const { td } = useDashboardLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback copy via temporary textarea if Clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={copied ? td('Response copied') : td('Copy response')}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
        copied
          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
          : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" aria-hidden="true" />
          <span>{td('Copied')}</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" aria-hidden="true" />
          <span>{td('Copy Response')}</span>
        </>
      )}
    </button>
  );
}
