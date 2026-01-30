'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { AnamLogo } from './AnamLogo';
import { SearchButton } from './SearchButton';
import { SearchModal } from './SearchModal';
import { RecipeSummary } from '@/lib/recipes';

interface HeaderProps {
  recipes?: RecipeSummary[];
}

export function Header({ recipes = [] }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="border-b border-slate-200/60 dark:border-neutral-700/50 bg-[#F5F5F5]/80 dark:bg-[#202122]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-2">
            <AnamLogo className="text-slate-900 dark:text-neutral-50 translate-y-[1px]" height={18} width={54} />
            <span className="text-slate-900 dark:text-neutral-100 font-normal text-lg">Cookbook</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="https://docs.anam.ai"
              className="text-slate-900 dark:text-neutral-100 hover:text-slate-600 dark:hover:text-neutral-300 active:text-slate-950 dark:active:text-neutral-50 motion-safe:transition-colors motion-reduce:transition-none"
            >
              Docs
            </Link>
            <Link
              href="https://docs.anam.ai/api-reference"
              className="text-slate-900 dark:text-neutral-100 hover:text-slate-600 dark:hover:text-neutral-300 active:text-slate-950 dark:active:text-neutral-50 motion-safe:transition-colors motion-reduce:transition-none flex items-center gap-1"
            >
              API Reference
              <svg className="w-3 h-3 opacity-50" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M3.5 3C3.22386 3 3 3.22386 3 3.5C3 3.77614 3.22386 4 3.5 4V3ZM8.5 3.5H9C9 3.22386 8.77614 3 8.5 3V3.5ZM8 8.5C8 8.77614 8.22386 9 8.5 9C8.77614 9 9 8.77614 9 8.5H8ZM2.64645 8.64645C2.45118 8.84171 2.45118 9.15829 2.64645 9.35355C2.84171 9.54882 3.15829 9.54882 3.35355 9.35355L2.64645 8.64645ZM3.5 4H8.5V3H3.5V4ZM8 3.5V8.5H9V3.5H8ZM8.14645 3.14645L2.64645 8.64645L3.35355 9.35355L8.85355 3.85355L8.14645 3.14645Z" fill="currentColor"/>
              </svg>
            </Link>
            <Link
              href="https://github.com/anam-org/anam-cookbook"
              className="text-slate-900 dark:text-neutral-100 hover:text-slate-600 dark:hover:text-neutral-300 active:text-slate-950 dark:active:text-neutral-50 motion-safe:transition-colors motion-reduce:transition-none flex items-center gap-1"
            >
              Source
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </Link>
            <ThemeToggle />
            <SearchButton onClick={() => setIsSearchOpen(true)} />
          </nav>
        </div>
      </header>
      {isSearchOpen && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          recipes={recipes}
        />
      )}
    </>
  );
}
