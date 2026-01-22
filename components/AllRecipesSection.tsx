'use client';

import { useState } from 'react';
import { RecipeSummary } from '@/lib/recipes';
import { RecipeListItem } from './RecipeListItem';

interface AllRecipesSectionProps {
  recipes: RecipeSummary[];
  allTags: string[];
}

// Tags to hide from filter dropdown
const hiddenTags = ['intermediate', 'advanced'];

export function AllRecipesSection({ recipes, allTags }: AllRecipesSectionProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const visibleTags = allTags.filter((tag) => !hiddenTags.includes(tag));

  const filteredRecipes = selectedTag
    ? recipes.filter((r) => r.frontmatter.tags?.includes(selectedTag))
    : recipes;

  return (
    <section>
      {/* Header with count and filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-neutral-100">
            All
          </h2>
          <span className="text-slate-400 dark:text-neutral-500 text-lg">
            {filteredRecipes.length}
          </span>
        </div>

        {/* Filter dropdown */}
        <div className="relative">
          <select
            value={selectedTag || ''}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="appearance-none bg-transparent text-slate-600 dark:text-neutral-400 text-sm pr-6 cursor-pointer hover:text-slate-900 dark:hover:text-neutral-200 focus:outline-none"
          >
            <option value="">Filter</option>
            {visibleTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-neutral-500 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Recipe list */}
      <div className="divide-y divide-slate-200 dark:divide-neutral-800">
        {filteredRecipes.map((recipe) => (
          <RecipeListItem key={recipe.slug} recipe={recipe} />
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="py-12 text-center text-slate-500 dark:text-neutral-500">
          No recipes found{selectedTag ? ` for "${selectedTag}"` : ''}.
        </div>
      )}
    </section>
  );
}
