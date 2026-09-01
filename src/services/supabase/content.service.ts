import { supabase } from '../../lib/supabase/client';

export async function fetchPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(error.message);
  return data;
}
