// src/lib/mapping.ts
import { supabase } from '@/integrations/supabase/client'

export async function applyExtractionToDeclaration(
  declarationId: string,
  doc: { id: string, doc_type: string, extraction_payload: any }
) {
  const p = doc.extraction_payload
  if (!p) return

  switch (doc.doc_type) {
    case 'acte_deces': {
      const fields: Record<string, any> = {
        full_name: p.defunt?.full_name,
        birth_date: p.defunt?.birth_date,
        death_date: p.defunt?.death_date,
        death_place: p.defunt?.death_place,
        domicile: p.defunt?.domicile,
      }
      const filled = Object.entries(fields)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k]) => k)
      await supabase.from('defunts').upsert({
        declaration_id: declarationId,
        ...fields,
        pre_rempli_fields: filled,
      }, { onConflict: 'declaration_id' })
      break
    }

    case 'releve_bancaire':
      await supabase.from('actif_items').insert({
        declaration_id: declarationId,
        type_bien: 'compte',
        libelle: `Compte ${p.banque} (${p.type_compte ?? 'courant'})`,
        valeur_estimee: p.solde,
        details: { banque: p.banque, iban: p.iban, date_releve: p.date_releve, source_doc_id: doc.id },
        pre_rempli: true
      })
      break

    case 'titre_propriete':
      await supabase.from('actif_items').insert({
        declaration_id: declarationId,
        type_bien: 'immobilier',
        libelle: p.adresse ?? 'Bien immobilier',
        valeur_estimee: p.valeur_acte,
        details: { ...p, source_doc_id: doc.id },
        pre_rempli: true
      })
      break

    case 'assurance_vie':
      await supabase.from('actif_items').insert({
        declaration_id: declarationId,
        type_bien: 'assurance_vie',
        libelle: `AV ${p.compagnie}`,
        valeur_estimee: p.capital,
        details: { ...p, source_doc_id: doc.id },
        pre_rempli: true
      })
      break

    case 'releve_portefeuille':
      await supabase.from('actif_items').insert({
        declaration_id: declarationId,
        type_bien: 'titre',
        libelle: `${p.type_compte ?? 'Titres'} ${p.courtier}`,
        valeur_estimee: p.valorisation,
        details: { ...p, source_doc_id: doc.id },
        pre_rempli: true
      })
      break

    case 'acte_donation':
      await supabase.from('donations').insert({
        declaration_id: declarationId,
        date_donation: p.date_donation,
        beneficiaire_name: p.beneficiaire,
        type_donation: p.type_donation,
        montant: p.montant,
        enregistree_fiscalement: p.enregistree_fiscalement,
        pre_rempli: true
      })
      break

    case 'justificatif_dette':
      await supabase.from('passif_items').insert({
        declaration_id: declarationId,
        type_dette: p.type_dette,
        libelle: p.creancier,
        montant: p.montant,
        pre_rempli: true
      })
      break
  }
}
