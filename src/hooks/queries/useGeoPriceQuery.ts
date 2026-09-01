import { useQuery } from '@tanstack/react-query';
import { getGeoPrice } from '../../services/supabase/pricing.service';

export function useGeoPriceQuery(sku: string, basePricePHP: number, countryCode: string) {
  return useQuery({
    queryKey: ['supabase-geoPrice', sku, countryCode],
    queryFn: () => getGeoPrice(sku, countryCode),
    staleTime: 1000 * 60 * 60, // 1 hour caching for pricing rules
    enabled: Boolean(sku && countryCode),
  });
}
