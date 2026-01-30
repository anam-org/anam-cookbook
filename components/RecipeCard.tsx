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
      className="group flex flex-col h-full min-h-[200px] p-6 bg-[#F5F5F5] dark:bg-[#202122] border border-[#FF6200] rounded-xl hover:shadow-[0_0_0_3px_rgba(255,98,0,0.15)] hover:-translate-y-0.5 active:scale-[0.98] motion-safe:transition-[border-color,transform,box-shadow] motion-reduce:transition-none"
    >
      <div className="mb-3 text-xs" style={{ fontFamily: 'Berkeley Mono, monospace', color: '#FF6200' }}>
        {new Date(frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>

      <div className="mb-4">
        <h3 className="font-semibold text-lg text-slate-900 dark:text-neutral-50">
          {frontmatter.title}
        </h3>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-200/60 dark:border-neutral-700/50 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-500">
        <div className="flex flex-wrap gap-2">
          {visibleTags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} size="sm" />
          ))}
          {visibleTags.length > 3 && (
            <span>+{visibleTags.length - 3}</span>
          )}
        </div>
        {authors.length > 0 && (
          <div className="flex -space-x-2">
            {authors.map((username, i) => (
              <Image
                key={username}
                src={`https://github.com/${username}.png`}
                alt={username}
                width={26}
                height={26}
                className="w-[26px] h-[26px] rounded-full ring-2 ring-[#F5F5F5] dark:ring-[#202122]"
                style={{ zIndex: authors.length - i }}
                unoptimized
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
