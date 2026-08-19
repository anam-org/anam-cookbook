'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { ReactNode, useEffect } from 'react';
import {
  AnalyticsConsent,
  CONSENT_CHANGE_EVENT,
  readConsent,
} from '@/lib/analytics/consent';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    function applyConsent(consent: AnalyticsConsent | null) {
      if (!posthogKey) return;

      if (consent?.analytics && !posthog.__loaded) {
        posthog.init(posthogKey, {
          api_host: '/ingest',
          ui_host: 'https://us.posthog.com',
          person_profiles: 'identified_only',
          capture_pageview: false,
        });
      } else if (consent?.analytics) {
        posthog.opt_in_capturing();
      } else if (posthog.__loaded) {
        posthog.reset();
        posthog.opt_out_capturing();
      }

      if (consent?.analytics) {
        posthog.capture('$pageview', { $current_url: window.location.href });
      }
    }

    function handleConsent(event: Event) {
      applyConsent((event as CustomEvent<AnalyticsConsent>).detail);
    }

    applyConsent(readConsent());
    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsent);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsent);
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
