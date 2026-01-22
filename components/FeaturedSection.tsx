import { RecipeSummary } from '@/lib/recipes';
import { RecipeCard } from './RecipeCard';

interface FeaturedSectionProps {
  recipes: RecipeSummary[];
}

export function FeaturedSection({ recipes }: FeaturedSectionProps) {
  if (recipes.length === 0) return null;

  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-neutral-100 mb-6">
        Featured Cookbooks
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.slug} recipe={recipe} />
        ))}
      </div>
    </section>
  );
}
