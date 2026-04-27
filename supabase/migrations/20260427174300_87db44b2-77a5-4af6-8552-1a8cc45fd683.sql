ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS declared_no_notary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_responsibility boolean DEFAULT false;