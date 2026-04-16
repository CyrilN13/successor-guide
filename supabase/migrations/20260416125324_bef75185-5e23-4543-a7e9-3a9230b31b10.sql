CREATE POLICY "anon_insert_actif_items"
ON public.actif_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM declarations d
    WHERE d.id = actif_items.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_select_actif_items"
ON public.actif_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM declarations d
    WHERE d.id = actif_items.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_update_actif_items"
ON public.actif_items
FOR UPDATE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM declarations d
    WHERE d.id = actif_items.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);

CREATE POLICY "anon_delete_actif_items"
ON public.actif_items
FOR DELETE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM declarations d
    WHERE d.id = actif_items.declaration_id
      AND d.user_id IS NULL
      AND d.anonymous_token IS NOT NULL
  )
);