import Link from 'next/link';
import Image from 'next/image';
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
  const authors = frontmatter.authors || [];

  return (
    <Link
      href={`/${slug}`}
      className="group flex flex-col h-full p-6 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl hover:border-slate-300 dark:hover:border-neutral-600 hover:shadow-sm dark:hover:shadow-neutral-900/50 transition-all"
    >
      <div className="mb-4">
        <h3 className="font-semibold text-lg text-slate-900 dark:text-neutral-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {frontmatter.title}
        </h3>
      </div>

      <div className="mb-4 text-xs text-slate-400 dark:text-neutral-500">
        {new Date(frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-neutral-700 flex items-center justify-between text-xs text-slate-400 dark:text-neutral-500">
        <div className="flex flex-wrap gap-2">
          {visibleTags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} size="sm" />
          ))}
          {visibleTags.length > 3 && (
            <span>+{visibleTags.length - 3}</span>
          )}
        </div>
        {authors.length > 0 && (
          <div className="flex">
            {authors.map((username, i) => (
              <Image
                key={username}
                src={`https://github.com/${username}.png`}
                alt={username}
                width={26}
                height={26}
                className="w-[26px] h-[26px] rounded-full ring-2 ring-white dark:ring-neutral-800"
                style={{ marginLeft: i > 0 ? '-8px' : 0, zIndex: authors.length - i }}
                unoptimized
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
