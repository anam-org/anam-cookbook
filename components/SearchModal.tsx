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
    return recipes.filter((recipe) => {
      const matchesTitle = recipe.frontmatter.title.toLowerCase().includes(q);
      const matchesDescription = recipe.frontmatter.description.toLowerCase().includes(q);
      const matchesTags = recipe.frontmatter.tags?.some((tag) => tag.toLowerCase().includes(q));
      return matchesTitle || matchesDescription || matchesTags;
    }).slice(0, 8);
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
    <div className="fixed inset-0 z-[100]">
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
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
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
              className="w-full pl-12 pr-12 py-4 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent text-lg"
            />
            <button
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Results */}
          {query.trim() && (
            <div className="mt-3 bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
              {filteredRecipes.length > 0 ? (
                <ul className="divide-y divide-neutral-700">
                  {filteredRecipes.map((recipe) => (
                    <li key={recipe.slug}>
                      <Link
                        href={`/${recipe.slug}`}
                        onClick={onClose}
                        className="block px-4 py-3 hover:bg-neutral-700/50 transition-colors"
                      >
                        <div className="font-medium text-neutral-100">
                          {recipe.frontmatter.title}
                        </div>
                        <div className="text-sm text-neutral-400 mt-0.5 line-clamp-1">
                          {recipe.frontmatter.description}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center text-neutral-500">
                  No recipes found for "{query}"
                </div>
              )}
            </div>
          )}

          {/* Keyboard hint */}
          <div className="mt-3 text-center text-sm text-neutral-500">
            Press <kbd className="px-1.5 py-0.5 bg-neutral-700 rounded text-neutral-400">ESC</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}
