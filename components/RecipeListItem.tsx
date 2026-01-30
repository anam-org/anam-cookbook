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
      className="group flex items-center justify-between gap-4 py-2.5 hover:bg-slate-100/40 dark:hover:bg-neutral-800/30 active:bg-slate-200/40 dark:active:bg-neutral-800/40 -mx-4 px-4 motion-safe:transition-colors motion-reduce:transition-none"
    >
      {/* Left side: Title */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-slate-900 dark:text-neutral-100 truncate">
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
      <div className="text-xs flex-shrink-0 w-28 text-right" style={{ fontFamily: 'Berkeley Mono, monospace', color: '#FF6200' }}>
        {new Date(frontmatter.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </div>
    </Link>
  );
}
