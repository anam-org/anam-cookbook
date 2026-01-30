'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { RecipeSummary } from '@/lib/recipes';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: RecipeSummary[];
}

export function SearchModal({ isOpen, onClose, recipes }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredRecipes = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results = [];
    for (const recipe of recipes) {
      if (results.length >= 8) break;
      const matchesTitle = recipe.frontmatter.title.toLowerCase().includes(q);
      const matchesDescription = recipe.frontmatter.description.toLowerCase().includes(q);
      const matchesTags = recipe.frontmatter.tags?.some((tag) => tag.toLowerCase().includes(q));
      if (matchesTitle || matchesDescription || matchesTags) {
        results.push(recipe);
      }
    }
    return results;
  }, [query, recipes]);

  // Focus input when modal opens and handle native input events
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Add native input event listener for browser automation compatibility
          const handleInput = (e: Event) => {
            const target = e.target as HTMLInputElement;
            setQuery(target.value);
          };
          inputRef.current.addEventListener('input', handleInput);
          return () => inputRef.current?.removeEventListener('input', handleInput);
        }
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-label="Search recipes">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative flex flex-col items-center pt-[15vh] px-4">
        <div className="w-full max-w-xl">
          {/* Search Input */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              aria-label="Search recipes"
              className="w-full pl-12 pr-12 py-4 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-neutral-600 focus-visible:border-transparent text-lg"
            />
            <button
              onClick={onClose}
              aria-label="Close search (Escape)"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-neutral-500 hover:text-slate-700 dark:hover:text-neutral-300 active:text-slate-900 dark:active:text-neutral-200 motion-safe:transition-colors motion-reduce:transition-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Results */}
          {query.trim() && (
            <div className="mt-3 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl overflow-hidden">
              {filteredRecipes.length > 0 ? (
                <ul className="divide-y divide-slate-200 dark:divide-neutral-700">
                  {filteredRecipes.map((recipe) => (
                    <li key={recipe.slug}>
                      <Link
                        href={`/${recipe.slug}`}
                        onClick={onClose}
                        className="block px-4 py-3 hover:bg-slate-100 dark:hover:bg-neutral-700/50 active:bg-slate-200 dark:active:bg-neutral-700 motion-safe:transition-colors motion-reduce:transition-none"
                      >
                        <div className="font-medium text-slate-900 dark:text-neutral-100">
                          {recipe.frontmatter.title}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-neutral-400 mt-0.5 line-clamp-1">
                          {recipe.frontmatter.description}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center text-slate-500 dark:text-neutral-500">
                  <p>No recipes found for "{query}"</p>
                  <p className="text-sm mt-2">Try searching for "nextjs", "javascript", or "turnkey"</p>
                </div>
              )}
            </div>
          )}

          {/* Keyboard hint */}
          <div className="mt-3 text-center text-sm text-slate-500 dark:text-neutral-500">
            Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-neutral-700 rounded text-slate-700 dark:text-neutral-400">ESC</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}
