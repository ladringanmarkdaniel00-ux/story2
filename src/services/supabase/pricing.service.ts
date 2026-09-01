import { supabase } from '../../lib/supabase/client';

export async function getGeoPrice(sku: string, countryCode: string) {
  // Uses Supabase RPC (Remote Procedure Call) to hit a custom Postgres Function
  // @ts-ignore: RPC function is not yet typed
  const { data, error } = await supabase.rpc('calculate_geo_price', { 
    p_sku: sku, 
    p_country: countryCode 
  });
  
  if (error) throw new Error(error.message);
  return data;
}
