'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { ReactNode, useEffect } from 'react';
import {
  AnalyticsConsent,
  CONSENT_CHANGE_EVENT,
  readConsent,
} from '@/lib/analytics/consent';
import {
  enforcePostHogConsent,
  safeAnalyticsUrl,
} from '@/lib/analytics/posthog-consent';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    function applyConsent(consent: AnalyticsConsent | null) {
      if (!posthogKey) return;

      if (!posthog.__loaded) {
        posthog.init(posthogKey, {
          api_host: '/cookbook/ingest',
          ui_host: 'https://us.posthog.com',
          person_profiles: 'identified_only',
          capture_pageview: false,
          cookieless_mode: 'on_reject',
          // An unanswered banner starts in the same storage-free reduced mode
          // as rejection. Acceptance upgrades PostHog to normal persistence.
          opt_out_capturing_by_default: true,
          before_send: enforcePostHogConsent,
        });
      }

      if (consent?.analytics) {
        posthog.opt_in_capturing();
      } else if (consent) {
        posthog.stopSessionRecording();
        posthog.opt_out_capturing();
      }

      posthog.capture('$pageview', {
        $current_url: safeAnalyticsUrl(window.location.href),
      });
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
