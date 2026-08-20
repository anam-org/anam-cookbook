'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AnalyticsConsent,
  readConsent,
  saveConsent,
} from '@/lib/analytics/consent';

const DENIED: AnalyticsConsent = {
  analytics: false,
  advertising: false,
};

export function CookieConsent() {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const current = readConsent();
    setOpen(!current);
  }, []);

  function apply(consent: AnalyticsConsent) {
    saveConsent(consent);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <section
      role="dialog"
      aria-label="Cookie preferences"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-lg dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
    >
      <h2 className="text-sm font-semibold">Optional cookies</h2>
      <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-neutral-400">
        We use optional cookies for analytics and advertising. If you decline,
        we’ll only use cookieless measurement.{' '}
        <Link
          className="text-slate-900 underline underline-offset-4 dark:text-white"
          href="https://anam.ai/privacy-policy"
        >
          Privacy policy
        </Link>
        .
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="h-8 rounded-lg border border-slate-300 bg-transparent px-4 text-sm font-normal hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6200] focus-visible:ring-offset-2 dark:border-neutral-700 dark:hover:bg-neutral-900 dark:focus-visible:ring-offset-neutral-950"
          onClick={() => apply(DENIED)}
        >
          Decline
        </button>
        <button
          type="button"
          className="h-8 rounded-lg border border-[#ff6200] bg-[#ff6200] px-4 text-sm font-normal text-white hover:border-[#e55800] hover:bg-[#e55800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6200] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950"
          onClick={() => apply({ analytics: true, advertising: true })}
        >
          Accept
        </button>
      </div>
    </section>
  );
}
