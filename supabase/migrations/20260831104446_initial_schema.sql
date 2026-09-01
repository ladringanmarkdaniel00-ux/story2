-- Users table extends auth.users
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'client',
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stories table
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.users(id) NOT NULL,
  title TEXT NOT NULL,
  media_url TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  base_price_php NUMERIC NOT NULL,
  status TEXT DEFAULT 'active',
  stock INTEGER DEFAULT 0,
  media_urls TEXT[] DEFAULT '{}',
  department TEXT,
  category TEXT,
  subcategory TEXT,
  product_type TEXT,
  series TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regional prices table
CREATE TABLE public.regional_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT REFERENCES public.products(sku) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  local_price NUMERIC NOT NULL,
  currency VARCHAR(3) NOT NULL,
  UNIQUE(sku, country_code)
);

-- Auto-generate SKU Trigger
CREATE OR REPLACE FUNCTION generate_product_sku()
RETURNS TRIGGER AS $$
DECLARE
  generated_sku TEXT;
  dept_prefix TEXT := '';
  cat_prefix TEXT := '';
BEGIN
  IF NEW.sku IS NULL OR trim(NEW.sku) = '' THEN
    IF NEW.department IS NOT NULL AND trim(NEW.department) != '' THEN
      dept_prefix := UPPER(SUBSTRING(regexp_replace(NEW.department, '[^a-zA-Z0-9]', '', 'g'), 1, 3)) || '-';
    END IF;
    
    IF NEW.category IS NOT NULL AND trim(NEW.category) != '' THEN
      cat_prefix := UPPER(SUBSTRING(regexp_replace(NEW.category, '[^a-zA-Z0-9]', '', 'g'), 1, 3)) || '-';
    END IF;

    generated_sku := dept_prefix || cat_prefix || UPPER(SUBSTRING(md5(random()::text), 1, 6));
    NEW.sku := generated_sku;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_product_sku
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION generate_product_sku();

-- Product updated_at Trigger
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION update_products_updated_at();

-- ==========================================
-- STORAGE SETUP & RLS POLICIES
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES 
('media', 'media', true), 
('avatars', 'avatars', true) 
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- ==========================================
-- RLS POLICIES
-- ==========================================
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Admins can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update posts" ON public.posts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete posts" ON public.posts FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can view stories" ON public.stories FOR SELECT USING (true);
CREATE POLICY "Admins can create stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update stories" ON public.stories FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete stories" ON public.stories FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Products RLS Policies
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (status = 'active' OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Regional Prices RLS Policies
CREATE POLICY "Anyone can view regional prices" ON public.regional_prices FOR SELECT USING (true);
CREATE POLICY "Admins can insert regional prices" ON public.regional_prices FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update regional prices" ON public.regional_prices FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete regional prices" ON public.regional_prices FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public can view media"
ON storage.objects FOR SELECT
USING (bucket_id IN ('media', 'avatars'));

CREATE POLICY "Admins can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ) AND
  (
    name LIKE 'uploads/' || auth.uid()::text || '/story/%' OR 
    name LIKE 'uploads/' || auth.uid()::text || '/post/%' OR 
    name LIKE 'uploads/' || auth.uid()::text || '/hero/%' OR 
    name LIKE 'uploads/' || auth.uid()::text || '/product/%'
  )
);

CREATE POLICY "Admins can update media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ) AND
  (
    name LIKE 'uploads/' || auth.uid()::text || '/story/%' OR 
    name LIKE 'uploads/' || auth.uid()::text || '/post/%' OR 
    name LIKE 'uploads/' || auth.uid()::text || '/hero/%' OR 
    name LIKE 'uploads/' || auth.uid()::text || '/product/%'
  )
);

CREATE POLICY "Admins can delete media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ) AND
  (
    name LIKE 'uploads/' || auth.uid()::text || '/story/%' OR 
    name LIKE 'uploads/' || auth.uid()::text || '/post/%' OR 
    name LIKE 'uploads/' || auth.uid()::text || '/hero/%' OR 
    name LIKE 'uploads/' || auth.uid()::text || '/product/%'
  )
);

-- ==========================================
-- DATA MIGRATION (LEGACY PATHS -> UUID)
-- ==========================================
DO $$
DECLARE
  user_rec RECORD;
  email_encoded TEXT;
BEGIN
  FOR user_rec IN SELECT id, email FROM auth.users LOOP
    IF user_rec.email IS NOT NULL AND user_rec.email != '' THEN
      email_encoded := replace(user_rec.email, '@', '%40');
      
      UPDATE storage.objects
      SET name = replace(name, 'uploads/' || user_rec.email || '/', 'uploads/' || user_rec.id || '/')
      WHERE bucket_id = 'media' AND name LIKE 'uploads/' || user_rec.email || '/%';
      
      UPDATE storage.objects
      SET name = replace(name, 'uploads/' || email_encoded || '/', 'uploads/' || user_rec.id || '/')
      WHERE bucket_id = 'media' AND name LIKE 'uploads/' || email_encoded || '/%';
      
      UPDATE public.stories
      SET media_url = replace(replace(media_url, 'uploads/' || email_encoded || '/', 'uploads/' || user_rec.id || '/'), 'uploads/' || user_rec.email || '/', 'uploads/' || user_rec.id || '/')
      WHERE media_url LIKE '%uploads/' || email_encoded || '/%' OR media_url LIKE '%uploads/' || user_rec.email || '/%';
      
      UPDATE public.products
      SET media_urls = array(SELECT replace(replace(url, 'uploads/' || email_encoded || '/', 'uploads/' || user_rec.id || '/'), 'uploads/' || user_rec.email || '/', 'uploads/' || user_rec.id || '/') FROM unnest(media_urls) AS url)
      WHERE array_to_string(media_urls, ',') LIKE '%uploads/' || email_encoded || '/%' OR array_to_string(media_urls, ',') LIKE '%uploads/' || user_rec.email || '/%';
      
      UPDATE public.posts
      SET media_urls = array(SELECT replace(replace(url, 'uploads/' || email_encoded || '/', 'uploads/' || user_rec.id || '/'), 'uploads/' || user_rec.email || '/', 'uploads/' || user_rec.id || '/') FROM unnest(media_urls) AS url)
      WHERE array_to_string(media_urls, ',') LIKE '%uploads/' || email_encoded || '/%' OR array_to_string(media_urls, ',') LIKE '%uploads/' || user_rec.email || '/%';
    END IF;
  END LOOP;
END;
$$;

UPDATE storage.objects
SET name = regexp_replace(name, '^(uploads/[^/]+/product/)[0-9]{4}-[0-9]{2}-[0-9]{2}/', '\1uncategorized/')
WHERE bucket_id = 'media' AND name ~ '^uploads/[^/]+/product/[0-9]{4}-[0-9]{2}-[0-9]{2}/';

UPDATE public.products
SET media_urls = array(SELECT regexp_replace(url, '(uploads/[^/]+/product/)[0-9]{4}-[0-9]{2}-[0-9]{2}/', '\1uncategorized/') FROM unnest(media_urls) AS url)
WHERE array_to_string(media_urls, ',') ~ '(uploads/[^/]+/product/)[0-9]{4}-[0-9]{2}-[0-9]{2}/';

-- ============================================================================
-- ADD STORY VIEWS COUNT (Analytics)
-- ============================================================================

-- Add viewer_count to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS viewer_count INTEGER NOT NULL DEFAULT 0;

-- Create story_views tracking table to prevent duplicate view increments
CREATE TABLE IF NOT EXISTS public.story_views (
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT, -- For tracking guest/anonymous views uniquely
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_story_views PRIMARY KEY (story_id, session_id)
);

-- Allow anyone to insert a view
CREATE POLICY "Anyone can record a view" ON public.story_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view view records" ON public.story_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- RPC to securely increment the viewer count only if not viewed yet
CREATE OR REPLACE FUNCTION increment_story_view(
  p_story_id UUID,
  p_session_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to insert the view record
  BEGIN
    INSERT INTO public.story_views (story_id, viewer_id, session_id)
    VALUES (p_story_id, auth.uid(), p_session_id);
    
    -- If successful (no unique violation), increment the count
    UPDATE public.stories
    SET viewer_count = viewer_count + 1
    WHERE id = p_story_id;
  EXCEPTION WHEN unique_violation THEN
    -- Already viewed by this session, do nothing
    NULL;
  END;
END;
$$;

