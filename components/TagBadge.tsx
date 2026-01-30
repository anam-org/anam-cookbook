import clsx from 'clsx';

interface TagBadgeProps {
  tag: string;
  size?: 'sm' | 'md';
  active?: boolean;
  onClick?: () => void;
}

// Subtle, low-contrast tag colors
const tagColors: Record<string, { light: string; dark: string }> = {
  // Integration types
  agents: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
  turnkey: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
  'custom-llm': {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
  livekit: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
  'anam-lab': {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },

  // SDKs
  javascript: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
  typescript: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
  python: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
  react: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
  'react-native': {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },

  // Features
  rag: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
  tools: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
  interruption: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
  multilingual: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },

  // Difficulty (only beginner kept)
  beginner: {
    light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
    dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
  },
};

const defaultColor = {
  light: 'bg-slate-100/60 text-slate-600 border-slate-200/50',
  dark: 'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40',
};

export function TagBadge({ tag, size = 'md', active = false, onClick }: TagBadgeProps) {
  const colors = tagColors[tag] || defaultColor;

  const className = clsx(
    'inline-flex items-center rounded-full font-medium border uppercase motion-safe:transition-[opacity,box-shadow] motion-reduce:transition-none',
    size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
    colors.light,
    colors.dark,
    onClick && 'cursor-pointer hover:opacity-80 active:opacity-70',
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
