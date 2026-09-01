/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { DynamicGeoPricePayload } from './geoPricingEngine';

// ============================================================================
// 1. IMMUTABLE CONTRACTS & INTERFACES
// ============================================================================

export interface FetchGeoPriceOptions {
  readonly timeoutMs?: number;
}

// ============================================================================
// 2. VALIDATION & SANITIZATION UTILITIES
// ============================================================================

/**
 * Generates a deterministic cache key
 */
function createCacheKey(sku: string, basePricePHP: number, countryCode?: string): string {
  return `${sku.trim().toUpperCase()}_${basePricePHP.toFixed(2)}_${(countryCode || 'AUTO').toUpperCase()}`;
}

/**
 * Validates request arguments strictly before initiating network traffic
 */
function validateFetchInput(sku: string, basePricePHP: number, overrideCountry?: string): void {
  if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
    throw new TypeError('[GeoPricing] Invalid parameter: "sku" must be a non-empty string.');
  }
  if (typeof basePricePHP !== 'number' || !Number.isFinite(basePricePHP) || basePricePHP <= 0) {
    throw new TypeError('[GeoPricing] Invalid parameter: "basePricePHP" must be a positive finite number.');
  }
  if (overrideCountry && (typeof overrideCountry !== 'string' || !/^[A-Z]{2}$/i.test(overrideCountry))) {
    throw new TypeError('[GeoPricing] Invalid parameter: "overrideCountry" must be a valid 2-letter ISO code.');
  }
}

/**
 * Validates that the server response matches the required schema contract
 */
function validateServerResponse(data: unknown): data is DynamicGeoPricePayload {
  if (!data || typeof data !== 'object') return false;
  const res = data as DynamicGeoPricePayload;
  return (
    typeof res.schemaVersion === 'string' &&
    typeof res.configId === 'string' &&
    typeof res.rawNumericPrice === 'number' &&
    typeof res.formattedDisplayPrice === 'string' &&
    typeof res.currency === 'string'
  );
}

// ============================================================================
// 3. MAIN FETCH CLIENT IMPLEMENTATION & TANSTACK QUERY HOOK
// ============================================================================

/**
 * Executes the raw fetch request (separated for testability)
 */
export async function fetchGeoPrice(
  sku: string,
  basePricePHP: number,
  overrideCountry?: string,
  signal?: AbortSignal
): Promise<DynamicGeoPricePayload> {
  validateFetchInput(sku, basePricePHP, overrideCountry);
  
  const cleanSku = sku.trim();
  const cleanCountry = overrideCountry ? overrideCountry.trim().toUpperCase() : undefined;

  const response = await fetch('/api/geo-price', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF Mitigation
    },
    body: JSON.stringify({
      sku: cleanSku,
      basePricePHP,
      overrideCountry: cleanCountry,
    }),
    signal,
  });

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      const errorPayload = await response.json().catch(() => null);
      const serverErrorMessage =
        (errorPayload as { readonly error?: string; readonly message?: string } | null)?.error ||
        (errorPayload as { readonly error?: string; readonly message?: string } | null)?.message;
      throw new Error(
        serverErrorMessage || `[GeoPricing] Client Error (${response.status}): Failed to resolve price.`
      );
    }
    throw new Error(`[GeoPricing] Server responded with status ${response.status}`);
  }

  const data: unknown = await response.json();

  if (!validateServerResponse(data)) {
    throw new TypeError('[GeoPricing] Corrupted response payload received from server.');
  }

  return data;
}

/**
 * Production-ready Geo-Pricing API React Query Hook
 * 
 * Features:
 * - Handled by TanStack Query for Cache, Retries, Deduplication
 * - Automatic Network Cancellation (AbortController) via QuerySignal
 * - Strict Input & Output Contract Validation
 */
export function useGeoPrice(
  sku: string,
  basePricePHP: number,
  overrideCountry?: string
): UseQueryResult<DynamicGeoPricePayload, Error> {
  const cleanSku = typeof sku === 'string' ? sku.trim() : '';
  const cleanCountry = typeof overrideCountry === 'string' ? overrideCountry.trim() : undefined;
  const cacheKey = createCacheKey(cleanSku, basePricePHP, cleanCountry);
  
  return useQuery({
    queryKey: ['geo-price', cacheKey],
    queryFn: async ({ signal }) => fetchGeoPrice(cleanSku, basePricePHP, cleanCountry, signal),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    enabled: Boolean(cleanSku && basePricePHP > 0),
  });
}

export default useGeoPrice;
