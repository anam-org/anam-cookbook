'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language: string;
  highlightedHtml: string;
  filename?: string;
}

export function CodeBlock({ code, language, highlightedHtml, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="not-prose relative group my-6">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#24292e] rounded-t-lg border-b border-white/10">
          <span className="text-sm text-slate-300 font-mono">
            {filename}
          </span>
          <span className="text-xs text-slate-400 uppercase">{language}</span>
        </div>
      )}
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-2 rounded-md bg-white/10 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:text-slate-200 transition-all z-10"
        style={{ top: filename ? '3rem' : '0.5rem' }}
        aria-label="Copy code"
      >
        {copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
      <div
        className={filename ? '[&>pre]:rounded-t-none' : ''}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </div>
  );
}
