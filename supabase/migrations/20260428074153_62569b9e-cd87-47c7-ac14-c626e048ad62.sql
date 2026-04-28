ALTER TABLE public.heritiers
  ADD COLUMN IF NOT EXISTS situation_matrimoniale text,
  ADD COLUMN IF NOT EXISTS conjoint_civilite text,
  ADD COLUMN IF NOT EXISTS conjoint_nom_naissance text,
  ADD COLUMN IF NOT EXISTS conjoint_prenoms text,
  ADD COLUMN IF NOT EXISTS date_mariage date,
  ADD COLUMN IF NOT EXISTS lieu_mariage text,
  ADD COLUMN IF NOT EXISTS regime_matrimonial text,
  ADD COLUMN IF NOT EXISTS regime_modifie boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nationalite text DEFAULT 'française',
  ADD COLUMN IF NOT EXISTS resident_fiscal_france boolean DEFAULT true;