import { getClientCountry, sanitizeCountryCode, type CountryCode } from './clientCountry';
import { calculateGeoPrice, type DynamicGeoPricePayload } from './geoPricingEngine';

export interface ResolvePriceOptions {
  readonly overrideCountry?: string;
  readonly apiKey?: string;
  readonly requestHeaders?: Headers | Record<string, unknown>;
}

export interface ProductPriceInput {
  readonly sku: string;
  readonly basePricePHP: number;
}

/**
 * Universal Header Normalizer
 * Converts Fetch Headers, Next.js header instances, or plain Node.js record objects into standard Web Headers.
 */
function normalizeHeaders(headers?: Headers | Record<string, unknown>): Headers | undefined {
  if (!headers) return undefined;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers;
  }
  if (typeof headers === 'object') {
    const standardHeaders = new Headers();
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        standardHeaders.set(key, value);
      } else if (Array.isArray(value)) {
        standardHeaders.set(key, value.join(', '));
      }
    }
    return standardHeaders;
  }
  return undefined;
}

/**
 * Validates SKU and monetary parameters strictly
 */
function isValidPriceInput(sku: unknown, basePrice: unknown): boolean {
  return (
    typeof sku === 'string' &&
    sku.trim().length > 0 &&
    typeof basePrice === 'number' &&
    Number.isFinite(basePrice) &&
    basePrice > 0 &&
    basePrice <= 1_000_000_000
  );
}

/**
 * Safely resolves the target country code with multi-tier fail-open boundaries.
 */
async function resolveSafeCountryCode(
  overrideCountry?: string,
  normalizedHeaders?: Headers
): Promise<CountryCode> {
  const sanitizedOverride = sanitizeCountryCode(overrideCountry);
  if (sanitizedOverride) {
    return sanitizedOverride;
  }

  try {
    const location = await getClientCountry(normalizedHeaders);
    return location.countryCode;
  } catch {
    return 'PH' as CountryCode; // Fallback directly to domestic store baseline
  }
}

/**
 * Resolves localized pricing for an individual product SKU.
 *
 * Execution Hierarchy:
 * 1. Explicit User/UI Country Override
 * 2. Edge / Session / GeoIP Country Resolution
 * 3. Pure Mathematical Geo-Pricing Execution
 */
export async function resolveProductPrice(
  sku: string,
  basePricePHP: number,
  options: ResolvePriceOptions = {}
): Promise<DynamicGeoPricePayload> {
  const { overrideCountry, apiKey, requestHeaders } = options;
  const normalizedHeaders = normalizeHeaders(requestHeaders);

  // 1. Fast Validation Guard
  if (!isValidPriceInput(sku, basePricePHP)) {
    return calculateGeoPrice(
      typeof sku === 'string' && sku.trim().length > 0 ? sku.trim() : 'INVALID_SKU',
      typeof basePricePHP === 'number' && Number.isFinite(basePricePHP) ? basePricePHP : 0,
      'PH',
      undefined,
      normalizedHeaders
    );
  }

  // 2. Resolve Country Code with Fail-Open Protection
  const targetCountry = await resolveSafeCountryCode(overrideCountry, normalizedHeaders);

  // 3. Financial Pipeline Execution
  return calculateGeoPrice(
    sku.trim(),
    basePricePHP,
    targetCountry,
    apiKey,
    normalizedHeaders
  );
}

/**
 * High-Throughput Batch Resolver for Catalogs, Collections, and Product Grids.
 *
 * Performance Safeguards:
 * - Resolves target country ONCE for the entire collection ($O(1)$ async overhead).
 * - Executes calculation pipeline in parallel.
 * - Suppresses AI valuation calls in batch mode to eliminate API quota exhaustion ($429$) and latency spikes.
 * - Isolates item execution so one corrupted SKU will not fail the batch.
 */
export async function resolveBatchProductPrices(
  items: readonly ProductPriceInput[],
  options: ResolvePriceOptions = {}
): Promise<DynamicGeoPricePayload[]> {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const { overrideCountry, requestHeaders } = options;
  const normalizedHeaders = normalizeHeaders(requestHeaders);

  // 1. Resolve Target Region once for all items in batch
  const targetCountry = await resolveSafeCountryCode(overrideCountry, normalizedHeaders);

  // 2. Compute all prices in parallel (AI valuation omitted for bulk performance)
  return Promise.all(
    items.map(async (item) => {
      try {
        if (!isValidPriceInput(item?.sku, item?.basePricePHP)) {
          return await calculateGeoPrice(
            item?.sku || 'INVALID_SKU',
            typeof item?.basePricePHP === 'number' ? item.basePricePHP : 0,
            targetCountry,
            undefined,
            normalizedHeaders
          );
        }

        return await calculateGeoPrice(
          item.sku.trim(),
          item.basePricePHP,
          targetCountry,
          undefined,
          normalizedHeaders
        );
      } catch {
        // Fallback for an individual item failure
        return calculateGeoPrice(
          item?.sku || 'ERROR_SKU',
          0,
          targetCountry,
          undefined,
          normalizedHeaders
        );
      }
    })
  );
}
