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
  const [saved, setSaved] = useState<AnalyticsConsent | null>(null);
  const [choices, setChoices] = useState(DENIED);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const current = readConsent();
    setSaved(current);
    setChoices(current ?? DENIED);
    setOpen(!current);
  }, []);

  function apply(consent: AnalyticsConsent) {
    saveConsent(consent);
    setSaved(consent);
    setChoices(consent);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="fixed bottom-4 right-4 z-50 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        onClick={() => {
          setChoices(saved ?? DENIED);
          setOpen(true);
        }}
      >
        Cookie settings
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed bottom-4 right-4 z-50 w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-slate-300 bg-white p-5 text-slate-900 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
    >
      <h2 className="text-lg font-semibold">Your privacy choices</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-300">
        We use optional analytics to understand site usage and advertising
        cookies to measure campaigns. If you reject analytics cookies, PostHog
        uses reduced cookieless audience measurement.{' '}
        <Link className="underline" href="https://anam.ai/privacy-policy">
          Privacy policy
        </Link>
      </p>

      <div className="mt-4 flex gap-5 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={choices.analytics}
            onChange={(event) =>
              setChoices((current) => ({
                ...current,
                analytics: event.target.checked,
              }))
            }
          />
          Analytics
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={choices.advertising}
            onChange={(event) =>
              setChoices((current) => ({
                ...current,
                advertising: event.target.checked,
              }))
            }
          />
          Advertising
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-neutral-700"
          onClick={() => apply(DENIED)}
        >
          Reject optional
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-neutral-700"
          onClick={() => apply(choices)}
        >
          Save choices
        </button>
        <button
          type="button"
          className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white"
          onClick={() =>
            apply({ analytics: true, advertising: true })
          }
        >
          Accept all
        </button>
      </div>
    </section>
  );
}
