'use client';

import { useEffect } from 'react';
import {
  CONSENT_CHANGE_EVENT,
  readConsent,
} from '@/lib/analytics/consent';

const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
] as const;

function readStoredAttribution(): Record<string, string> {
  try {
    const match = document.cookie.match(/(?:^|; )anam_attribution=([^;]*)/);
    return match ? JSON.parse(decodeURIComponent(match[1])) : {};
  } catch {
    return {};
  }
}

export function Attribution() {
  useEffect(() => {
    function persistAndDecorate() {
      if (!readConsent()?.advertising) return;

      const current = new URLSearchParams(window.location.search);
      const freshAttribution = Object.fromEntries(
        ATTRIBUTION_PARAMS.flatMap((key) => {
          const value = current.get(key);
          return value ? [[key, value]] : [];
        }),
      );

      if (Object.keys(freshAttribution).length > 0) {
        document.cookie = `anam_attribution=${encodeURIComponent(JSON.stringify(freshAttribution))}; path=/; domain=.anam.ai; max-age=${60 * 60 * 24 * 30}; SameSite=Lax; Secure`;
      }

      const attribution =
        Object.keys(freshAttribution).length > 0
          ? freshAttribution
          : readStoredAttribution();

      document.querySelectorAll<HTMLAnchorElement>('a[href*="lab.anam.ai"]').forEach((link) => {
        const url = new URL(link.href);
        Object.entries(attribution).forEach(([key, value]) => {
          if (!url.searchParams.has(key)) url.searchParams.set(key, value);
        });
        link.href = url.toString();
      });
    }

    persistAndDecorate();
    window.addEventListener(CONSENT_CHANGE_EVENT, persistAndDecorate);
    return () =>
      window.removeEventListener(CONSENT_CHANGE_EVENT, persistAndDecorate);
  }, []);

  return null;
}
