import type { BeforeSendFn } from 'posthog-js';

import { readConsent } from '@/lib/analytics/consent';

const CAMPAIGN_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
]);
const COOKIELESS_DISTINCT_ID = '$posthog_cookieless';

export function safeAnalyticsUrl(value: string): string {
  const url = new URL(value, window.location.origin);
  const safeParams = new URLSearchParams();
  url.searchParams.forEach((parameterValue, key) => {
    if (CAMPAIGN_PARAMS.has(key)) safeParams.append(key, parameterValue);
  });
  url.search = safeParams.toString();
  url.hash = '';
  return url.toString();
}

export const enforcePostHogConsent: BeforeSendFn = (event) => {
  const consent = readConsent();
  if (consent?.analytics) return event;
  if (!event || !['$pageview', '$pageleave'].includes(event.event)) return null;

  return {
    uuid: event.uuid,
    event: event.event,
    ...(event.timestamp ? { timestamp: event.timestamp } : {}),
    properties: {
      token: event.properties?.token,
      distinct_id: COOKIELESS_DISTINCT_ID,
      $device_id: null,
      $cookieless_mode: true,
      $process_person_profile: false,
      $current_url:
        typeof event.properties?.$current_url === 'string'
          ? safeAnalyticsUrl(event.properties.$current_url)
          : undefined,
      $referrer: undefined,
      $referring_domain: undefined,
    },
  };
};
