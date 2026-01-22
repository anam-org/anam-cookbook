import clsx from 'clsx';

interface CalloutProps {
  type?: 'tip' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
}

const calloutStyles = {
  tip: {
    container: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-800 dark:text-emerald-300',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-800 dark:text-amber-300',
    text: 'text-amber-700 dark:text-amber-400',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-800 dark:text-blue-300',
    text: 'text-blue-700 dark:text-blue-400',
  },
};

const icons = {
  tip: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const styles = calloutStyles[type];

  return (
    <div className={clsx('my-6 rounded-lg border p-4', styles.container)}>
      <div className="flex gap-3">
        <div className={clsx('flex-shrink-0 mt-0.5', styles.icon)}>{icons[type]}</div>
        <div className={clsx('flex-1', styles.text)}>
          {title && (
            <p className={clsx('font-medium mb-1', styles.title)}>{title}</p>
          )}
          <div className="[&>p]:m-0 text-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
