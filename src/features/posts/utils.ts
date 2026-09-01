import { Post } from './types';
import { getFromStorage, saveToStorage } from '../stories/utils';
import { supabase } from '../../lib/supabase/client';

const POSTS_KEY = 'local_posts';

/**
 * Helper to check if Supabase is properly configured
 */
function isSupabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return url && !url.includes('placeholder');
}

export async function fetchPosts(signal?: AbortSignal): Promise<Post[]> {
  // Respect cancellation signal if provided
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const localPosts = (await getFromStorage<Post[]>(POSTS_KEY)) || [];

  if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Sync remote data to local storage
        await saveToStorage(POSTS_KEY, data as Post[]);
        return data as Post[];
      }
    } catch (err) {
      console.warn('[Sync] Failed to fetch posts from Supabase, falling back to local storage', err);
    }
  }

  return localPosts;
}

export async function createPost(post: Post) {
  const current = (await getFromStorage<Post[]>(POSTS_KEY)) || [];
  const updated = [post, ...current.filter((p) => p.id !== post.id)];
  
  // Optimistic local save
  await saveToStorage(POSTS_KEY, updated);

  if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const dbPost = {
        id: post.id,
        author_id: post.userId || 'system',
        content: post.caption,
        media_urls: post.media.map(m => m.url),
        is_pinned: post.isPinned || false,
      };
      // @ts-expect-error Supabase types strictness on Insert
      await supabase.from('posts').insert([dbPost as any]);
    } catch (err) {
      console.warn('[Sync] Failed to sync new post to Supabase', err);
    }
  }
}

export async function updatePost(post: Post) {
  const current = (await getFromStorage<Post[]>(POSTS_KEY)) || [];
  const updated = current.map((p) => (p.id === post.id ? post : p));
  
  // Optimistic local save
  await saveToStorage(POSTS_KEY, updated);

  if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const dbPost = {
        id: post.id,
        author_id: post.userId || 'system',
        content: post.caption,
        media_urls: post.media.map(m => m.url),
        is_pinned: post.isPinned || false,
      };
      // @ts-expect-error Supabase types strictness on Update
      await supabase.from('posts').update(dbPost as any).eq('id', post.id);
    } catch (err) {
      console.warn('[Sync] Failed to sync updated post to Supabase', err);
    }
  }
}

export async function deletePost(id: string) {
  const current = (await getFromStorage<Post[]>(POSTS_KEY)) || [];
  const updated = current.filter((p) => p.id !== id);
  
  // Optimistic local save
  await saveToStorage(POSTS_KEY, updated);

  if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      await supabase.from('posts').delete().eq('id', id);
    } catch (err) {
      console.warn('[Sync] Failed to delete post from Supabase', err);
    }
  }
}
