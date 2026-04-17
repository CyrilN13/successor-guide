ALTER TABLE public.actif_items DROP CONSTRAINT IF EXISTS actif_items_type_bien_check;
ALTER TABLE public.actif_items ADD CONSTRAINT actif_items_type_bien_check
  CHECK (type_bien = ANY (ARRAY[
    'compte_bancaire'::text, 'compte'::text,
    'immobilier'::text,
    'vehicule'::text,
    'titres'::text, 'titre'::text,
    'entreprise'::text,
    'assurance_vie'::text,
    'crypto'::text,
    'autre'::text
  ]));