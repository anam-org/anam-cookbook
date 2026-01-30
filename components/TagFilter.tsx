'use client';

import { useState, useRef, useEffect } from 'react';
import { TagBadge } from './TagBadge';

interface TagFilterProps {
  tags: string[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

export function TagFilter({ tags, selectedTag, onTagSelect }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleTagClick = (tag: string) => {
    onTagSelect(selectedTag === tag ? null : tag);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200 border border-slate-200/60 dark:border-neutral-700/50 rounded-lg motion-safe:transition-colors motion-reduce:transition-none"
      >
        <span className="uppercase font-medium">{selectedTag || 'Filter'}</span>
        <svg
          className={`w-4 h-4 motion-safe:transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#202122] border border-slate-200/60 dark:border-neutral-700/50 rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-1 space-y-0.5">
            {/* Clear filter option */}
            <button
              onClick={() => {
                onTagSelect(null);
                setIsOpen(false);
              }}
              className="w-full text-left px-2 py-1 text-[10px] text-slate-600 dark:text-neutral-400 hover:bg-slate-100/40 dark:hover:bg-neutral-800/30 rounded motion-safe:transition-colors motion-reduce:transition-none"
            >
              <span className="uppercase font-medium">All</span>
            </button>

            {/* Tag options */}
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="w-full text-left px-2 py-1 hover:bg-slate-100/40 dark:hover:bg-neutral-800/30 rounded motion-safe:transition-colors motion-reduce:transition-none"
              >
                <TagBadge tag={tag} size="sm" active={selectedTag === tag} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
