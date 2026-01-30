'use client';

interface SearchButtonProps {
  onClick: () => void;
}

export function SearchButton({ onClick }: SearchButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-3 text-slate-900 dark:text-neutral-100 hover:text-slate-600 dark:hover:text-neutral-300 active:text-slate-950 dark:active:text-neutral-50 motion-safe:transition-colors motion-reduce:transition-none"
      aria-label="Search cookbooks"
    >
      <svg
        className="w-[18px] h-[18px]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </button>
  );
}
