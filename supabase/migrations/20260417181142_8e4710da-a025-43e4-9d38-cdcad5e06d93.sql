-- defunts
CREATE POLICY "anon_select_defunts" ON public.defunts FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = defunts.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_insert_defunts" ON public.defunts FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM declarations d WHERE d.id = defunts.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_update_defunts" ON public.defunts FOR UPDATE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = defunts.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL))
WITH CHECK (EXISTS (SELECT 1 FROM declarations d WHERE d.id = defunts.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_delete_defunts" ON public.defunts FOR DELETE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = defunts.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));

-- donations
CREATE POLICY "anon_select_donations" ON public.donations FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = donations.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_insert_donations" ON public.donations FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM declarations d WHERE d.id = donations.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_update_donations" ON public.donations FOR UPDATE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = donations.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL))
WITH CHECK (EXISTS (SELECT 1 FROM declarations d WHERE d.id = donations.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_delete_donations" ON public.donations FOR DELETE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = donations.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));

-- calculation_results
CREATE POLICY "anon_select_calc" ON public.calculation_results FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = calculation_results.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_insert_calc" ON public.calculation_results FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM declarations d WHERE d.id = calculation_results.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_update_calc" ON public.calculation_results FOR UPDATE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = calculation_results.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL))
WITH CHECK (EXISTS (SELECT 1 FROM declarations d WHERE d.id = calculation_results.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_delete_calc" ON public.calculation_results FOR DELETE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = calculation_results.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));

-- uploaded_documents
CREATE POLICY "anon_select_uploads" ON public.uploaded_documents FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = uploaded_documents.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_insert_uploads" ON public.uploaded_documents FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM declarations d WHERE d.id = uploaded_documents.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_update_uploads" ON public.uploaded_documents FOR UPDATE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = uploaded_documents.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL))
WITH CHECK (EXISTS (SELECT 1 FROM declarations d WHERE d.id = uploaded_documents.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));
CREATE POLICY "anon_delete_uploads" ON public.uploaded_documents FOR DELETE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM declarations d WHERE d.id = uploaded_documents.declaration_id AND d.user_id IS NULL AND d.anonymous_token IS NOT NULL));