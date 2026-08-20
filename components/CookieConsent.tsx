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
      className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
    >
      <h2 className="text-sm font-medium">Optional cookies</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-neutral-400">
        Allow analytics and advertising cookies to help us improve Anam. If you
        decline, we’ll only use reduced cookieless measurement.{' '}
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
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-950 dark:hover:bg-neutral-900"
          onClick={() => apply(DENIED)}
        >
          Decline
        </button>
        <button
          type="button"
          className="rounded-lg bg-orange-700 px-3 py-2 text-sm text-white hover:bg-orange-800"
          onClick={() => apply({ analytics: true, advertising: true })}
        >
          Accept
        </button>
      </div>
    </section>
  );
}
