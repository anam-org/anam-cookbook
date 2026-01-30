import { getAllRecipes, getAllTags, getFeaturedRecipes } from '@/lib/recipes';
import { featuredRecipeSlugs } from '@/lib/config';
import { TopicsSection } from '@/components/TopicsSection';
import { FeaturedSection } from '@/components/FeaturedSection';
import { AllRecipesSection } from '@/components/AllRecipesSection';

export default function HomePage() {
  const allRecipes = getAllRecipes();
  const allTags = getAllTags();
  const featuredRecipes = getFeaturedRecipes(featuredRecipeSlugs);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Topics Section */}
      <TopicsSection />

      {/* Featured Cookbooks Section */}
      <FeaturedSection recipes={featuredRecipes} />

      {/* All Cookbooks Section */}
      <AllRecipesSection recipes={allRecipes} allTags={allTags} />
    </div>
  );
}
