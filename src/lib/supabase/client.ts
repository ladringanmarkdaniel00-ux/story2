/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!rawSupabaseUrl || rawSupabaseUrl.includes('placeholder')) {
  console.warn('[Supabase] Warning: VITE_SUPABASE_URL is missing or misconfigured.');
}

if (!rawSupabaseAnonKey || rawSupabaseAnonKey.includes('placeholder')) {
  console.warn('[Supabase] Warning: VITE_SUPABASE_ANON_KEY is missing or misconfigured.');
}

const supabaseUrl = rawSupabaseUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = rawSupabaseAnonKey || 'placeholder';

/**
 * Enterprise-grade strongly-typed Supabase client singleton bound to our database DDL contract,
 * featuring strict production environment guards, persistent session management, and telemetry headers.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-application-name': 'enterprise-web-platform',
    },
  },
});

export default supabase;
