-- Allow anonymous users to manage heritiers via their anonymous declarations
CREATE POLICY "anon_insert_heritiers"
ON public.heritiers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM declarations d
    WHERE d.id = heritiers.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_select_heritiers"
ON public.heritiers
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM declarations d
    WHERE d.id = heritiers.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_update_heritiers"
ON public.heritiers
FOR UPDATE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM declarations d
    WHERE d.id = heritiers.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_delete_heritiers"
ON public.heritiers
FOR DELETE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM declarations d
    WHERE d.id = heritiers.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);