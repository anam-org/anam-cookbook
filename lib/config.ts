// Homepage configuration

export interface TopicConfig {
  name: string;
  slug: string;
  // CSS gradient for the card background
  gradient: string;
}

// Topics displayed at the top of the homepage
// Each topic links to a filtered view of recipes with that tag
export const topics: TopicConfig[] = [
  {
    name: 'Agents',
    slug: 'agents',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #fb923c 100%)',
  },
  {
    name: 'Custom LLM',
    slug: 'custom-llm',
    gradient: 'linear-gradient(135deg, #d946ef 0%, #a855f7 50%, #ec4899 100%)',
  },
  {
    name: 'RAG',
    slug: 'rag',
    gradient: 'linear-gradient(135deg, #34d399 0%, #22c55e 50%, #14b8a6 100%)',
  },
  {
    name: 'Tools',
    slug: 'tools',
    gradient: 'linear-gradient(135deg, #fb923c 0%, #f59e0b 50%, #facc15 100%)',
  },
  {
    name: 'Livekit',
    slug: 'livekit',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #4f46e5 100%)',
  },
  {
    name: 'Anam Lab',
    slug: 'anam-lab',
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #22d3ee 50%, #5eead4 100%)',
  },
];

// Slugs of featured recipes to show in the "Featured Cookbooks" section
// Order matters - first items appear first
export const featuredRecipeSlugs: string[] = [
  'getting-started-with-anam',
  'getting-started-with-livekit',
  'elevenlabs-conversational-agents',
  'client-side-tools',
  'byo-llm-integration',
  'rag-knowledge-base',
];
