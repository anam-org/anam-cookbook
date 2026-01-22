import clsx from 'clsx';

interface TagBadgeProps {
  tag: string;
  size?: 'sm' | 'md';
  active?: boolean;
  onClick?: () => void;
}

// Dark-mode compatible tag colors
const tagColors: Record<string, { light: string; dark: string }> = {
  // Integration types
  agents: {
    light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dark: 'dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  },
  turnkey: {
    light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dark: 'dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  },
  'custom-llm': {
    light: 'bg-blue-50 text-blue-700 border-blue-200',
    dark: 'dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  'byo-llm': {
    light: 'bg-blue-50 text-blue-700 border-blue-200',
    dark: 'dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  livekit: {
    light: 'bg-purple-50 text-purple-700 border-purple-200',
    dark: 'dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  },
  'anam-lab': {
    light: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    dark: 'dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
  },

  // SDKs
  javascript: {
    light: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    dark: 'dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  },
  typescript: {
    light: 'bg-blue-50 text-blue-700 border-blue-200',
    dark: 'dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  python: {
    light: 'bg-green-50 text-green-700 border-green-200',
    dark: 'dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  react: {
    light: 'bg-sky-50 text-sky-700 border-sky-200',
    dark: 'dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  },
  'react-native': {
    light: 'bg-violet-50 text-violet-700 border-violet-200',
    dark: 'dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800',
  },

  // Features
  rag: {
    light: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    dark: 'dark:bg-fuchsia-900/30 dark:text-fuchsia-400 dark:border-fuchsia-800',
  },
  tools: {
    light: 'bg-teal-50 text-teal-700 border-teal-200',
    dark: 'dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
  },
  interruption: {
    light: 'bg-red-50 text-red-700 border-red-200',
    dark: 'dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  },
  multilingual: {
    light: 'bg-lime-50 text-lime-700 border-lime-200',
    dark: 'dark:bg-lime-900/30 dark:text-lime-400 dark:border-lime-800',
  },

  // Difficulty (only beginner kept)
  beginner: {
    light: 'bg-green-50 text-green-700 border-green-200',
    dark: 'dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
};

const defaultColor = {
  light: 'bg-slate-50 text-slate-700 border-slate-200',
  dark: 'dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
};

export function TagBadge({ tag, size = 'md', active = false, onClick }: TagBadgeProps) {
  const colors = tagColors[tag] || defaultColor;

  const className = clsx(
    'inline-flex items-center rounded-full font-medium border transition-all',
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
    colors.light,
    colors.dark,
    onClick && 'cursor-pointer hover:opacity-80',
    active && 'ring-2 ring-offset-1 ring-blue-500 dark:ring-blue-400 dark:ring-offset-neutral-900'
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {tag}
      </button>
    );
  }

  return <span className={className}>{tag}</span>;
}
