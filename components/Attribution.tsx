'use client';

import { usePathname, useSearchParams } from 'next/navigation';
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    function isLabLink(link: HTMLAnchorElement) {
      try {
        return new URL(link.href).origin === 'https://lab.anam.ai';
      } catch {
        return false;
      }
    }

    function updateLinks(
      root: ParentNode,
      attribution: Record<string, string> | null,
    ) {
      function updateLink(link: HTMLAnchorElement) {
        if (!isLabLink(link)) return;

        const url = new URL(link.href);
        ATTRIBUTION_PARAMS.forEach((key) => url.searchParams.delete(key));
        if (attribution) {
          Object.entries(attribution).forEach(([key, value]) => {
            url.searchParams.set(key, value);
          });
        }
        link.href = url.toString();
      }

      if (root instanceof HTMLAnchorElement) updateLink(root);
      root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(updateLink);
    }

    function removeCampaignParams() {
      updateLinks(document, null);
    }

    function captureAttribution() {
      if (!readConsent()?.advertising) return {};

      const current = new URLSearchParams(window.location.search);
      const freshAttribution = Object.fromEntries(
        ATTRIBUTION_PARAMS.flatMap((key) => {
          const value = current.get(key);
          return value ? [[key, value]] : [];
        }),
      );

      if (Object.keys(freshAttribution).length > 0) {
        document.cookie = `anam_attribution=${encodeURIComponent(JSON.stringify(freshAttribution))}; path=/; domain=.anam.ai; max-age=${60 * 60 * 24 * 30}; SameSite=Lax; Secure`;
        return freshAttribution;
      }

      return readStoredAttribution();
    }

    function persistAndDecorate() {
      const attribution = captureAttribution();
      updateLinks(document, attribution);
    }

    function handleConsent() {
      if (readConsent()?.advertising) {
        persistAndDecorate();
      } else {
        removeCampaignParams();
      }
    }

    const observer = new MutationObserver((mutations) => {
      const attribution = readConsent()?.advertising
        ? readStoredAttribution()
        : null;

      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) updateLinks(node, attribution);
        });
      }
    });

    handleConsent();
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsent);
    return () => {
      observer.disconnect();
      window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsent);
    };
  }, [pathname, searchParams]);

  return null;
}
