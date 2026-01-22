import Link from 'next/link';
import { RecipeSummary } from '@/lib/recipes';
import { TagBadge } from './TagBadge';

interface RecipeCardProps {
  recipe: RecipeSummary;
}

// Tags to hide from display (kept only as metadata)
const hiddenTags = ['intermediate', 'advanced'];

export function RecipeCard({ recipe }: RecipeCardProps) {
  const { slug, frontmatter } = recipe;
  const visibleTags = frontmatter.tags?.filter((tag) => !hiddenTags.includes(tag)) || [];

  return (
    <Link
      href={`/${slug}`}
      className="group flex flex-col h-full p-6 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl hover:border-slate-300 dark:hover:border-neutral-600 hover:shadow-sm dark:hover:shadow-neutral-900/50 transition-all"
    >
      <div className="mb-3">
        <h3 className="font-semibold text-lg text-slate-900 dark:text-neutral-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {frontmatter.title}
        </h3>
      </div>

      <p className="text-slate-600 dark:text-neutral-400 text-sm mb-4 line-clamp-2">
        {frontmatter.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {visibleTags.slice(0, 3).map((tag) => (
          <TagBadge key={tag} tag={tag} size="sm" />
        ))}
        {visibleTags.length > 3 && (
          <span className="text-xs text-slate-400 dark:text-neutral-500">+{visibleTags.length - 3}</span>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-neutral-700 flex items-center justify-between text-xs text-slate-400 dark:text-neutral-500">
        <span>{frontmatter.author}</span>
        <span>{new Date(frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
    </Link>
  );
}
