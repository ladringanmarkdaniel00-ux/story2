// clientcountry.ts

/**
 * Valid ISO 3166-1 alpha-2 Country Code Pattern
 */
export const ISO_ALPHA2_REGEX = /^[A-Z]{2}$/;

export type CountryCode = string & { readonly __brand: unique symbol };

export type GeoSource =
  | 'EDGE_HEADER'
  | 'MEMORY_CACHE'
  | 'SESSION_CACHE'
  | 'GEO_IP'
  | 'LOCALE_INFERENCE'
  | 'DEFAULT_FALLBACK';

export interface GeoLocationPayload {
  readonly countryCode: CountryCode;
  readonly source: GeoSource;
  readonly timestamp: number;
}

const CACHE_KEY = '__geo_country_payload_v2';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6-Hour Cache Expiration
const DEFAULT_FALLBACK_COUNTRY = 'PH' as CountryCode;

let inMemoryCache: GeoLocationPayload | null = null;
let activeRequestPromise: Promise<GeoLocationPayload> | null = null;

/**
 * Strict ISO 3166-1 alpha-2 Sanitizer & Type Guard
 */
export function sanitizeCountryCode(rawCode?: unknown): CountryCode | null {
  if (typeof rawCode !== 'string') return null;
  const trimmed = rawCode.trim().toUpperCase();
  if (ISO_ALPHA2_REGEX.test(trimmed)) {
    return trimmed as CountryCode;
  }
  return null;
}

/**
 * Non-invasive Browser Locale & TimeZone Inference
 * 0ms latency, zero 3rd-party IP leakage.
 */
function inferCountryFromLocale(): CountryCode {
  if (typeof navigator === 'undefined') {
    return DEFAULT_FALLBACK_COUNTRY;
  }

  try {
    // 1. Language Tags (e.g., "en-PH" -> "PH", "ja-JP" -> "JP")
    const languages = navigator.languages || [navigator.language];
    for (const lang of languages) {
      if (typeof lang === 'string') {
        const parts = lang.split('-');
        if (parts.length > 1) {
          const sanitized = sanitizeCountryCode(parts[parts.length - 1]);
          if (sanitized) return sanitized;
        }
      }
    }

    // 2. IANA TimeZone Resolution
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone) {
      if (timeZone.startsWith('Asia/Manila')) return 'PH' as CountryCode;
      if (timeZone.startsWith('America/New_York') || timeZone.startsWith('America/Los_Angeles') || timeZone.startsWith('America/Chicago')) return 'US' as CountryCode;
      if (timeZone.startsWith('Europe/London')) return 'GB' as CountryCode;
      if (timeZone.startsWith('Europe/Berlin') || timeZone.startsWith('Europe/Paris')) return 'DE' as CountryCode;
      if (timeZone.startsWith('Asia/Tokyo')) return 'JP' as CountryCode;
    }
  } catch {
    // Failthrough to standard fallback
  }

  return DEFAULT_FALLBACK_COUNTRY;
}

/**
 * Checks if a cached payload is structurally valid and unexpired
 */
function isValidPayload(payload: unknown): payload is GeoLocationPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as GeoLocationPayload;
  return (
    typeof p.countryCode === 'string' &&
    ISO_ALPHA2_REGEX.test(p.countryCode) &&
    typeof p.timestamp === 'number' &&
    Date.now() - p.timestamp < CACHE_TTL_MS
  );
}

/**
 * Persists location payload to in-memory cache and sessionStorage
 */
function persistCache(payload: GeoLocationPayload): void {
  inMemoryCache = payload;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Handles private mode or quota exhaustion safely
    }
  }
}

/**
 * Multi-layer Geo-Location Resolution Pipeline
 * Execution Priority:
 * 1. Memory Cache (0ms)
 * 2. SessionStorage Cache (0ms with TTL guard)
 * 3. Edge CDN Headers (Vercel `x-vercel-ip-country` / Cloudflare `cf-ipcountry`)
 * 4. Request Deduplication (In-flight promise sharing)
 * 5. GeoIP Lookup (1.5s AbortController guard)
 * 6. Non-invasive Locale/TimeZone Inference
 * 7. Store Domestic Fallback ('PH')
 */
export async function getClientCountry(customHeaders?: Headers): Promise<GeoLocationPayload> {
  const now = Date.now();

  // 1. Memory Cache Check
  if (inMemoryCache && isValidPayload(inMemoryCache)) {
    return { ...inMemoryCache, source: 'MEMORY_CACHE' };
  }

  // 2. Session Storage Check
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const rawStored = window.sessionStorage.getItem(CACHE_KEY);
      if (rawStored) {
        const parsed = JSON.parse(rawStored);
        if (isValidPayload(parsed)) {
          inMemoryCache = parsed;
          return { ...parsed, source: 'SESSION_CACHE' };
        }
      }
    } catch {
      // Gracefully ignore corrupt session cache
    }
  }

  // 3. Edge Header Inspection (Vercel / Cloudflare / CloudFront)
  if (customHeaders) {
    const edgeCountry =
      customHeaders.get('x-vercel-ip-country') ||
      customHeaders.get('cf-ipcountry') ||
      customHeaders.get('cloudfront-viewer-country');

    const sanitized = sanitizeCountryCode(edgeCountry);
    if (sanitized) {
      const payload: GeoLocationPayload = {
        countryCode: sanitized,
        source: 'EDGE_HEADER',
        timestamp: now,
      };
      persistCache(payload);
      return payload;
    }
  }

  // 4. In-Flight Request Deduplication
  if (activeRequestPromise) {
    return activeRequestPromise;
  }

  // 5. Asynchronous GeoIP Fallback with Cancellation
  activeRequestPromise = (async (): Promise<GeoLocationPayload> => {
    let resolvedCountry: CountryCode | null = null;
    let source: GeoSource = 'LOCALE_INFERENCE';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      // Attempt first-party endpoint before external fallback
      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const code = sanitizeCountryCode(data?.country_code);
        if (code) {
          resolvedCountry = code;
          source = 'GEO_IP';
        }
      }
    } catch {
      // Failover safely on timeout, network drop, or ad-blocker intervention
    } finally {
      activeRequestPromise = null;
    }

    // 6. Locale Inference Fallback
    if (!resolvedCountry) {
      resolvedCountry = inferCountryFromLocale();
      source = resolvedCountry === DEFAULT_FALLBACK_COUNTRY ? 'DEFAULT_FALLBACK' : 'LOCALE_INFERENCE';
    }

    const payload: GeoLocationPayload = {
      countryCode: resolvedCountry,
      source,
      timestamp: Date.now(),
    };

    persistCache(payload);
    return payload;
  })();

  return activeRequestPromise;
}

/**
 * Manually invalidates cached location records
 */
export function clearGeoCache(): void {
  inMemoryCache = null;
  activeRequestPromise = null;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore
    }
  }
}
