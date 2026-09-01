/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useGeoPrice } from '../../../lib/pricing/geoPricingClient';
import type { DynamicGeoPricePayload } from '../../../lib/pricing/geoPricingEngine';
import { getClientCountry } from '../../../lib/pricing/clientCountry';

let cachedCountryCode: string | null = null;
let countryLookupPromise: Promise<string> | null = null;

async function resolveCountryCode(explicitCountry?: string): Promise<string> {
  if (explicitCountry) return explicitCountry;
  if (cachedCountryCode) return cachedCountryCode;

  if (!countryLookupPromise) {
    countryLookupPromise = getClientCountry()
      .then((loc) => {
        cachedCountryCode = loc.countryCode;
        return loc.countryCode;
      })
      .catch((err) => {
        countryLookupPromise = null;
        throw err;
      });
  }

  return countryLookupPromise;
}

export interface UseProductGeoPriceOptions {
  debounceMs?: number;
  timeoutMs?: number;
  countryCode?: string;
  enabled?: boolean;
}

export interface UseProductGeoPriceResult {
  priceData: DynamicGeoPricePayload | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProductGeoPrice(
  sku: string | undefined,
  basePricePHP: number | undefined,
  options: UseProductGeoPriceOptions = {}
): UseProductGeoPriceResult {
  const { debounceMs = 300, countryCode, enabled = true } = options;

  const [debouncedSku, setDebouncedSku] = useState(sku);
  const [debouncedPrice, setDebouncedPrice] = useState(basePricePHP);
  const [resolvedCountry, setResolvedCountry] = useState<string | undefined>(countryCode);

  useEffect(() => {
    resolveCountryCode(countryCode).then(setResolvedCountry).catch(() => {});
  }, [countryCode]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSku(sku);
      setDebouncedPrice(basePricePHP);
    }, debounceMs);
    return () => clearTimeout(handler);
  }, [sku, basePricePHP, debounceMs]);

  const queryEnabled = Boolean(enabled && debouncedSku && debouncedPrice && debouncedPrice > 0);

  const { data, error, isLoading, refetch } = useGeoPrice(
    debouncedSku || '',
    debouncedPrice || 0,
    resolvedCountry
  );

  return {
    priceData: queryEnabled && data ? data : null,
    isLoading: queryEnabled && isLoading,
    error: error ? error.message : null,
    refetch,
  };
}
