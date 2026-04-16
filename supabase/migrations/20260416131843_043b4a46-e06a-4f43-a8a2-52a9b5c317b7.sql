ALTER TABLE public.passif_items
ADD COLUMN IF NOT EXISTS details jsonb DEFAULT NULL;

CREATE POLICY "anon_insert_passif_items"
ON public.passif_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id = passif_items.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_select_passif_items"
ON public.passif_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id = passif_items.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_update_passif_items"
ON public.passif_items
FOR UPDATE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id = passif_items.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id = passif_items.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_delete_passif_items"
ON public.passif_items
FOR DELETE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id = passif_items.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_upload_passif_files"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[2] = 'passif'
  AND EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_read_passif_files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[2] = 'passif'
  AND EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_update_passif_files"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[2] = 'passif'
  AND EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
)
WITH CHECK (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[2] = 'passif'
  AND EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_delete_passif_files"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[2] = 'passif'
  AND EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);