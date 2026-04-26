ALTER TABLE public.defunts
  ADD COLUMN IF NOT EXISTS pre_rempli_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.heritiers
  ADD COLUMN IF NOT EXISTS pre_rempli_fields jsonb NOT NULL DEFAULT '[]'::jsonb;