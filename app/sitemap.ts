import type { MetadataRoute } from 'next';
import { getAllRecipes } from '@/lib/recipes';
import { topics } from '@/lib/config';

const BASE_URL = 'https://anam.ai/cookbook';

export default function sitemap(): MetadataRoute.Sitemap {
  const recipes = getAllRecipes();

  const recipeEntries: MetadataRoute.Sitemap = recipes.map((recipe) => ({
    url: `${BASE_URL}/${recipe.slug}`,
    lastModified: new Date(recipe.frontmatter.date),
  }));

  const topicEntries: MetadataRoute.Sitemap = topics.map((topic) => ({
    url: `${BASE_URL}/topic/${topic.slug}`,
  }));

  return [
    { url: BASE_URL },
    ...topicEntries,
    ...recipeEntries,
  ];
}
