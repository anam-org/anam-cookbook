import clsx from 'clsx';

interface DifficultyBadgeProps {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  // Only show badge for beginner difficulty
  if (difficulty !== 'beginner') {
    return null;
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap uppercase',
        'bg-slate-100/60 text-slate-600 border-slate-200/50',
        'dark:bg-neutral-800/40 dark:text-neutral-400 dark:border-neutral-700/40'
      )}
    >
      Beginner
    </span>
  );
}
