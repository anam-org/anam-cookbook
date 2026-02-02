// Homepage configuration

export interface TopicConfig {
  name: string;
  slug: string;
  // CSS gradient for the card background
  gradient: string;
}

// Topics displayed at the top of the homepage
// Each topic links to a filtered view of cookbooks with that tag
export const topics: TopicConfig[] = [
  {
    name: 'Agents',
    slug: 'agents',
    // Cyan palette: ice blue → teal
    gradient: 'linear-gradient(135deg, #D9F2F9 0%, #7DD4E8 50%, #41BEE0 100%)',
  },
  {
    name: 'Custom LLM',
    slug: 'custom-llm',
    // Warm palette: coral → blush (reversed)
    gradient: 'linear-gradient(135deg, #E8846A 0%, #F2B8A0 50%, #F9ECE4 100%)',
  },
  {
    name: 'RAG',
    slug: 'rag',
    // Green palette: mint → forest green
    gradient: 'linear-gradient(135deg, #E8F2EC 0%, #8ED4AC 50%, #3DAA7D 100%)',
  },
  {
    name: 'Tools',
    slug: 'tools',
    // Warm cream palette: golden amber → ivory (reversed)
    gradient: 'linear-gradient(135deg, #C9A227 0%, #E5D88A 50%, #F4F2E1 100%)',
  },
  {
    name: 'Livekit',
    slug: 'livekit',
    // Purple palette: lavender → violet
    gradient: 'linear-gradient(135deg, #F0EBF8 0%, #C4B0E8 50%, #8B6FCF 100%)',
  },
  {
    name: 'Anam Lab',
    slug: 'anam-lab',
    // Rose palette: dusty rose → blush pink (reversed)
    gradient: 'linear-gradient(135deg, #D4728A 0%, #E8B4C0 50%, #F9ECE4 100%)',
  },
];

// Slugs of featured cookbooks to show in the "Featured Cookbooks" section
// Order matters - first items appear first
export const featuredRecipeSlugs: string[] = [
  'basic-nextjs-app',
  'getting-started-with-livekit',
  'elevenlabs-conversational-agents',
  'client-side-tools',
  'custom-llm-client-side',
  'rag-knowledge-base',
];
