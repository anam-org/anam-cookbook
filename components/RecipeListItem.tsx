import Link from 'next/link';
import { RecipeSummary } from '@/lib/recipes';
import { TagBadge } from './TagBadge';

interface RecipeListItemProps {
  recipe: RecipeSummary;
}

// Tags to hide from display (kept only as metadata)
const hiddenTags = ['intermediate', 'advanced'];

export function RecipeListItem({ recipe }: RecipeListItemProps) {
  const { slug, frontmatter } = recipe;
  const visibleTags = frontmatter.tags?.filter((tag) => !hiddenTags.includes(tag)) || [];

  return (
    <Link
      href={`/${slug}`}
      className="group flex items-center justify-between gap-4 py-4 border-b border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/50 -mx-4 px-4 transition-colors"
    >
      {/* Left side: Title */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-slate-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
          {frontmatter.title}
        </h3>
      </div>

      {/* Middle: Tags */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        {visibleTags.slice(0, 3).map((tag) => (
          <TagBadge key={tag} tag={tag} size="sm" />
        ))}
      </div>

      {/* Right side: Date */}
      <div className="text-sm text-slate-500 dark:text-neutral-500 flex-shrink-0 w-24 text-right">
        {new Date(frontmatter.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </div>
    </Link>
  );
}
