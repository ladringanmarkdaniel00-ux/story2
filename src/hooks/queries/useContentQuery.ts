import { useQuery } from '@tanstack/react-query';
import { fetchPosts } from '../../services/supabase/content.service';

export function usePostsQuery() {
  return useQuery({
    queryKey: ['supabase-posts'],
    queryFn: fetchPosts,
    staleTime: 1000 * 60, // 1 minute cache
  });
}
