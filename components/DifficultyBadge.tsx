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
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap',
        'bg-green-50 text-green-700 border-green-200',
        'dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
      )}
    >
      Beginner
    </span>
  );
}
