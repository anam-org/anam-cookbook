'use client';

import { useState } from 'react';
import { RecipeSummary } from '@/lib/recipes';
import { RecipeListItem } from './RecipeListItem';
import { TagFilter } from './TagFilter';

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
        <TagFilter
          tags={visibleTags}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
        />
      </div>

      {/* Recipe list */}
      <div className="divide-y divide-slate-200/60 dark:divide-neutral-700/50">
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
