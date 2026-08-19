export type AnalyticsConsent = {
  analytics: boolean;
  advertising: boolean;
};

export const CONSENT_COOKIE_NAME = 'anam_cookie_consent';
export const CONSENT_CHANGE_EVENT = 'anam:consent-change';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function readConsent(): AnalyticsConsent | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CONSENT_COOKIE_NAME}=([^;]*)`),
  );
  if (!match) return null;

  const parts = decodeURIComponent(match[1]).split('.');
  if (parts[0] !== 'v1' || parts.length !== 3) return null;

  return {
    analytics: parts[1] === '1',
    advertising: parts[2] === '1',
  };
}

function clearCookies(prefixes: string[]) {
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    if (!prefixes.some((prefix) => name.startsWith(prefix))) return;

    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${name}=; path=/; domain=.anam.ai; max-age=0; SameSite=Lax; Secure`;
  });
}

export function saveConsent(consent: AnalyticsConsent) {
  const value = `v1.${consent.analytics ? '1' : '0'}.${consent.advertising ? '1' : '0'}`;

  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; domain=.anam.ai; max-age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`;

  window.gtag?.('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.advertising ? 'granted' : 'denied',
    ad_user_data: consent.advertising ? 'granted' : 'denied',
    ad_personalization: consent.advertising ? 'granted' : 'denied',
  });

  if (!consent.analytics) {
    clearCookies(['_ga', '_gid', '_gat', 'ph_']);
  }
  if (!consent.advertising) {
    clearCookies(['_gcl_', '_fbp', '_fbc', 'anam_attribution']);
  }

  window.dispatchEvent(
    new CustomEvent<AnalyticsConsent>(CONSENT_CHANGE_EVENT, {
      detail: consent,
    }),
  );
}
