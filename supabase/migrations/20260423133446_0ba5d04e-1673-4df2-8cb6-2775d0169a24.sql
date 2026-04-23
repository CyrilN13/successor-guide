-- Allow anonymous & authenticated users to manage files in the 'uploads' bucket
-- Files are organized as: <declaration_id>/<doc_type>/<uuid>_<filename>
-- Access is granted when the declaration_id (first folder) belongs either to the
-- authenticated user, or to an anonymous declaration (no user, has token).

CREATE POLICY "uploads_anon_select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'uploads'
  AND EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND (
        (d.user_id IS NULL AND d.anonymous_token IS NOT NULL)
        OR d.user_id = auth.uid()
      )
  )
);

CREATE POLICY "uploads_anon_insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND (
        (d.user_id IS NULL AND d.anonymous_token IS NOT NULL)
        OR d.user_id = auth.uid()
      )
  )
);

CREATE POLICY "uploads_anon_update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'uploads'
  AND EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND (
        (d.user_id IS NULL AND d.anonymous_token IS NOT NULL)
        OR d.user_id = auth.uid()
      )
  )
);

CREATE POLICY "uploads_anon_delete"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'uploads'
  AND EXISTS (
    SELECT 1 FROM public.declarations d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND (
        (d.user_id IS NULL AND d.anonymous_token IS NOT NULL)
        OR d.user_id = auth.uid()
      )
  )
);