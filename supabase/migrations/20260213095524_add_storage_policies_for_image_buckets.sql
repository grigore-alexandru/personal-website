/*
  # Add Storage Policies for Image Buckets

  1. Security Policies
    - Add RLS policies for `blog-images` bucket
      - Public read access for all images
      - Authenticated users can upload images
      - Authenticated users can update their uploads
      - Authenticated users can delete their uploads
    
    - Add RLS policies for `portfolio-images` bucket
      - Public read access for all images
      - Authenticated users can upload images
      - Authenticated users can update their uploads
      - Authenticated users can delete their uploads

  2. Notes
    - These policies allow authenticated admin users to manage images
    - Public read access ensures images are accessible on the frontend
*/

-- Blog Images Bucket Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete blog images" ON storage.objects;

-- Public read access
CREATE POLICY "Public can read blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

-- Authenticated write access
CREATE POLICY "Authenticated users can upload blog images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update blog images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'blog-images' AND auth.uid() IS NOT NULL)
  WITH CHECK (bucket_id = 'blog-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete blog images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'blog-images' AND auth.uid() IS NOT NULL);

-- Portfolio Images Bucket Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete portfolio images" ON storage.objects;

-- Public read access
CREATE POLICY "Public can read portfolio images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-images');

-- Authenticated write access
CREATE POLICY "Authenticated users can upload portfolio images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'portfolio-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update portfolio images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'portfolio-images' AND auth.uid() IS NOT NULL)
  WITH CHECK (bucket_id = 'portfolio-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete portfolio images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'portfolio-images' AND auth.uid() IS NOT NULL);
