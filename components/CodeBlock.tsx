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
    <div className="relative group my-6 rounded-lg overflow-hidden border border-slate-700 dark:border-neutral-700 bg-slate-900 dark:bg-neutral-950">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 dark:bg-neutral-900 border-b border-slate-700 dark:border-neutral-800">
          <span className="text-sm text-slate-300 dark:text-neutral-400 font-mono">
            {filename}
          </span>
          <span className="text-xs text-slate-400 dark:text-neutral-500 uppercase">{language}</span>
        </div>
      )}
      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 p-2 rounded-md bg-slate-800 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 hover:bg-slate-700 dark:hover:bg-neutral-700 hover:text-slate-200 dark:hover:text-neutral-300 transition-all"
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
          className="overflow-x-auto p-4 [&>pre]:!m-0 [&>pre]:!bg-transparent"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </div>
    </div>
  );
}
