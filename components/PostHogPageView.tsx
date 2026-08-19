'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialPageView = useRef(true);

  useEffect(() => {
    // The provider captures the initial view after PostHog is initialized.
    if (isInitialPageView.current) {
      isInitialPageView.current = false;
      return;
    }

    if (pathname && posthog.__loaded) {
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
