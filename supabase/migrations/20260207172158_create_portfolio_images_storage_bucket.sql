/*
  # Create Portfolio Images Storage Bucket

  1. Storage
    - Create `portfolio-images` bucket for storing portfolio project hero images
    - Make it public for easy image access
    - 5MB file size limit
    - Allowed MIME types: JPEG, PNG, GIF, WebP
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-images',
  'portfolio-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];