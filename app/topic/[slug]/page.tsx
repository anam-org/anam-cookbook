import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRecipesByTag } from '@/lib/recipes';
import { topics } from '@/lib/config';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeListItem } from '@/components/RecipeListItem';

interface TopicPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return topics.map((topic) => ({
    slug: topic.slug,
  }));
}

export async function generateMetadata({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = topics.find((t) => t.slug === slug);

  if (!topic) {
    return { title: 'Topic Not Found' };
  }

  const title = `${topic.name} - Anam Cookbook`;
  const description = `Explore ${topic.name.toLowerCase()} cookbooks and tutorials for building with Anam AI avatars.`;
  const url = `https://anam.ai/cookbook/topic/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = topics.find((t) => t.slug === slug);

  if (!topic) {
    notFound();
  }

  const cookbooks = getRecipesByTag(slug);
  const featuredCookbooks = cookbooks.slice(0, 3);
  const remainingCookbooks = cookbooks.slice(3);

  return (
    <>
      {/* Topic header - full width container, centered content */}
      <div className="flex justify-center px-4 py-8">
        <div
          className="relative w-full max-w-lg rounded-xl overflow-hidden px-8 py-16"
          style={{ background: topic.gradient }}
        >
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 text-center">
            <h1 className="text-3xl font-bold text-white drop-shadow-md">
              {topic.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Body content - constrained width */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {/* Featured cookbooks as cards */}
        {featuredCookbooks.length > 0 && (
          <section className="mb-10">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {featuredCookbooks.map((cookbook) => (
                <RecipeCard key={cookbook.slug} recipe={cookbook} />
              ))}
            </div>
          </section>
        )}

        {/* Remaining cookbooks as list */}
        {remainingCookbooks.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100 mb-4">
              More cookbooks
            </h2>
            <div className="divide-y divide-slate-200/60 dark:divide-neutral-700/50">
              {remainingCookbooks.map((cookbook) => (
                <RecipeListItem key={cookbook.slug} recipe={cookbook} />
              ))}
            </div>
          </section>
        )}

        {cookbooks.length === 0 && (
          <div className="py-12 text-center text-slate-500 dark:text-neutral-500">
            <p>No cookbooks found for this topic yet.</p>
            <Link
              href="/"
              className="inline-block mt-4 text-slate-700 dark:text-neutral-300 underline hover:no-underline"
            >
              Browse all cookbooks
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
