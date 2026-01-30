import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getRecipeBySlug, getRecipeSlugs } from '@/lib/recipes';
import { isOrgMember } from '@/lib/organization';
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
    return { title: 'Cookbook Not Found' };
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
      {/* Header */}
      <header className="mb-12">
        <p className="text-sm mb-4 text-center" style={{ fontFamily: 'Berkeley Mono, monospace', color: '#FF6200' }}>
          {new Date(frontmatter.date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-neutral-50 mb-12 text-center">
          {frontmatter.title}
        </h1>

        <div className="flex items-center justify-between pb-6 border-b border-slate-200/60 dark:border-neutral-700/50">
          <div className="flex items-center gap-3">
            {frontmatter.authors && frontmatter.authors.length > 0 && (
              <div className="flex -space-x-2">
                {frontmatter.authors.map((username, i) => (
                  <Image
                    key={username}
                    src={`https://github.com/${username}.png`}
                    alt={username}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full ring-2 ring-[#F5F5F5] dark:ring-[#202122]"
                    style={{ zIndex: frontmatter.authors.length - i }}
                    unoptimized
                  />
                ))}
              </div>
            )}
            <span className="text-sm text-slate-600 dark:text-[rgb(209,213,219)]">
              {frontmatter.authors?.map((username, i) => (
                <span key={username}>
                  {username}{isOrgMember(username) && <span className="text-slate-500 dark:text-neutral-400"> (Anam)</span>}{i < frontmatter.authors.length - 1 && ', '}
                </span>
              ))}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <a
              href={`https://github.com/anam-org/anam-cookbook/blob/main/content/recipes/${slug}.mdx`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 dark:text-[rgb(209,213,219)] hover:text-slate-900 dark:hover:text-white active:text-slate-950 dark:active:text-neutral-50 motion-safe:transition-colors motion-reduce:transition-none flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Open in GitHub
            </a>
            <a
              href={`https://raw.githubusercontent.com/anam-org/anam-cookbook/main/content/recipes/${slug}.mdx`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 dark:text-[rgb(209,213,219)] hover:text-slate-900 dark:hover:text-white active:text-slate-950 dark:active:text-neutral-50 motion-safe:transition-colors motion-reduce:transition-none flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View markdown
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none [&>h1:first-child]:hidden">
        <MDXRemote source={content} components={mdxComponents} />
      </div>
    </article>
  );
}
