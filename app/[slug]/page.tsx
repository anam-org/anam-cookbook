import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getRecipeBySlug, getRecipeSlugs } from '@/lib/recipes';
import { TagBadge } from '@/components/TagBadge';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { mdxComponents } from '@/components/mdx';

interface RecipePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getRecipeSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: RecipePageProps) {
  const { slug } = await params;
  const recipe = getRecipeBySlug(slug);

  if (!recipe) {
    return { title: 'Recipe Not Found' };
  }

  return {
    title: `${recipe.frontmatter.title} | Anam Cookbook`,
    description: recipe.frontmatter.description,
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { slug } = await params;
  const recipe = getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  const { frontmatter, content } = recipe;

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <Link
          href="/"
          className="text-sm text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to recipes
        </Link>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-neutral-50 mb-4">
          {frontmatter.title}
        </h1>

        <p className="text-lg text-slate-600 dark:text-neutral-400 mb-6">
          {frontmatter.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {frontmatter.tags?.map((tag) => (
            <TagBadge key={tag} tag={tag} size="sm" />
          ))}
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-neutral-400 pb-6 border-b border-slate-200 dark:border-neutral-700">
          <span>By {frontmatter.author}</span>
          <span>&middot;</span>
          <span>
            {new Date(frontmatter.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none [&>h1:first-child]:hidden">
        <MDXRemote source={content} components={mdxComponents} />
      </div>
    </article>
  );
}
