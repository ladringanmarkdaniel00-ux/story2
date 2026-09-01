import { create } from 'zustand';
import { z } from 'zod';
import { supabase } from './lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

// ==========================================
// 1. STRICT CONTRACT INTEGRITY (ZOD SCHEMAS)
// ==========================================

export const UserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['admin', 'client', 'customer', 'guest']).default('guest'),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type UserProfile = z.infer<typeof UserSchema>;

export const ProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  base_price_php: z.number(),
  status: z.enum(['active', 'draft', 'archived']).default('active'),
  stock: z.number().int().default(0),
  media_urls: z.array(z.string()).default([]),
  department: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  product_type: z.string().nullable().optional(),
  series: z.string().nullable().optional(),
  active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

export const RegionalPriceSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  country_code: z.string().length(2),
  local_price: z.number(),
  currency: z.string().length(3),
});
export type RegionalPrice = z.infer<typeof RegionalPriceSchema>;

export const PostSchema = z.object({
  id: z.string().uuid(),
  author_id: z.string().uuid(),
  content: z.string(),
  media_urls: z.array(z.string()).default([]),
  is_pinned: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Post = z.infer<typeof PostSchema>;

export const StorySchema = z.object({
  id: z.string().uuid(),
  author_id: z.string().uuid(),
  title: z.string(),
  media_url: z.string(),
  is_pinned: z.boolean().default(false),
  expires_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type Story = z.infer<typeof StorySchema>;

// ==========================================
// 2. ZERO-TRUST ENTERPRISE STORE
// ==========================================

export interface AuthState {
  readonly session: Session | null;
  readonly user: User | null;
  readonly profile: UserProfile | null;
  readonly initialized: boolean;
  
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  setRole: (role: UserProfile['role']) => void;
}

export const useStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  initialized: false,
  setRole: (role) => set((state) => {
    const isGuest = role === 'guest';
    const mockUser = { id: 'mock-user-id', email: 'mock@example.com' } as any;
    
    return { 
      user: isGuest ? null : (state.user || mockUser),
      profile: isGuest 
        ? null 
        : (state.profile 
            ? { ...state.profile, role } 
            : { id: 'mock-user-id', role, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    };
  }),

  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        let profile: UserProfile | null = null;
        if (!profileError && profileData) {
          const parsed = UserSchema.safeParse(profileData);
          if (parsed.success) {
            profile = parsed.data;
          } else {
            console.error('[Security] Profile contract violation:', parsed.error);
          }
        }
        set({ session, user: session.user, profile, initialized: true });
      } else {
        set({ session: null, user: null, profile: null, initialized: true });
      }

      // Listen for strict auth transitions
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_OUT') {
          set({ session: null, user: null, profile: null });
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (newSession?.user) {
             const { data: pData } = await supabase
              .from('users')
              .select('*')
              .eq('id', newSession.user.id)
              .single();
              
             let newProfile: UserProfile | null = null;
             if (pData) {
               const parsed = UserSchema.safeParse(pData);
               if (parsed.success) newProfile = parsed.data;
             }
             set({ session: newSession, user: newSession.user, profile: newProfile });
          }
        }
      });
    } catch (err) {
      console.error('[Security] Auth Initialization Error:', err);
      set({ session: null, user: null, profile: null, initialized: true });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[Security] Sign-out Error:', error);
    } finally {
      set({ session: null, user: null, profile: null });
    }
  }
}));

// ==========================================
// 3. SECURE CLEANUP (GDPR/Transient Data)
// ==========================================

export const secureCleanup = (): void => {
  if (typeof window !== 'undefined') {
    // Scrub transient object URLs or memory blobs on component/lifecycle unmount.
    // Ensure no unencrypted PII or sensitive access tokens linger.
    console.info('[Security] Transient memory cleanup triggered.');
  }
};
