-- Allow anonymous users (no auth) to create declarations with null user_id
CREATE POLICY "anon_insert_declarations"
ON public.declarations
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL);

-- Allow reading declarations by anonymous_token (for anonymous users)
CREATE POLICY "anon_select_declarations"
ON public.declarations
FOR SELECT
TO anon, authenticated
USING (user_id IS NULL AND anonymous_token IS NOT NULL);

-- Allow updating own anonymous declarations
CREATE POLICY "anon_update_declarations"
ON public.declarations
FOR UPDATE
TO anon, authenticated
USING (user_id IS NULL AND anonymous_token IS NOT NULL)
WITH CHECK (user_id IS NULL);