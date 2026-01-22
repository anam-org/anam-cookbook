import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const recipesDirectory = path.join(process.cwd(), 'content/recipes');

export interface RecipeFrontmatter {
  title: string;
  description: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sdk?: 'javascript' | 'python' | 'react' | 'react-native';
  date: string;
  author: string;
}

export interface Recipe {
  slug: string;
  frontmatter: RecipeFrontmatter;
  content: string;
}

export interface RecipeSummary {
  slug: string;
  frontmatter: RecipeFrontmatter;
}

export function getRecipeSlugs(): string[] {
  if (!fs.existsSync(recipesDirectory)) {
    return [];
  }
  return fs
    .readdirSync(recipesDirectory)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''));
}

export function getRecipeBySlug(slug: string): Recipe | null {
  const fullPath = path.join(recipesDirectory, `${slug}.mdx`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    frontmatter: data as RecipeFrontmatter,
    content,
  };
}

export function getAllRecipes(): RecipeSummary[] {
  const slugs = getRecipeSlugs();

  const recipes = slugs
    .map((slug) => {
      const recipe = getRecipeBySlug(slug);
      if (!recipe) return null;
      return {
        slug: recipe.slug,
        frontmatter: recipe.frontmatter,
      };
    })
    .filter((recipe): recipe is RecipeSummary => recipe !== null)
    .sort((a, b) => {
      return new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime();
    });

  return recipes;
}

export function getAllTags(): string[] {
  const recipes = getAllRecipes();
  const tagSet = new Set<string>();

  recipes.forEach((recipe) => {
    recipe.frontmatter.tags?.forEach((tag) => tagSet.add(tag));
  });

  return Array.from(tagSet).sort();
}

export function getRecipesByTag(tag: string): RecipeSummary[] {
  return getAllRecipes().filter((recipe) =>
    recipe.frontmatter.tags?.includes(tag)
  );
}

export function getFeaturedRecipes(slugs: string[]): RecipeSummary[] {
  const allRecipes = getAllRecipes();
  return slugs
    .map((slug) => allRecipes.find((r) => r.slug === slug))
    .filter((r): r is RecipeSummary => r !== undefined);
}
