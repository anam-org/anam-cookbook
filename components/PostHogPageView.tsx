'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import posthog from 'posthog-js';
import { readConsent } from '@/lib/analytics/consent';

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && readConsent()?.analytics && posthog.__loaded) {
      let url = window.origin + pathname;
      const params = searchParams?.toString();
      if (params) {
        url = url + '?' + params;
      }
      posthog.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}
