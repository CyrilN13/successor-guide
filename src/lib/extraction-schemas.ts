export const EXTRACTION_SCHEMAS: Record<string, object> = {
  acte_deces: {
    type: "object",
    properties: {
      defunt: {
        type: "object",
        properties: {
          full_name:   { type: "string", description: "Nom et prénom complets du défunt" },
          birth_date:  { type: ["string","null"], description: "Date de naissance ISO YYYY-MM-DD" },
          death_date:  { type: ["string","null"], description: "Date de décès ISO YYYY-MM-DD" },
          birth_place: { type: ["string","null"], description: "Lieu de naissance" },
          death_place: { type: ["string","null"], description: "Lieu de décès" },
          domicile:    { type: ["string","null"], description: "Dernière adresse connue" }
        }
      }
    }
  },
  releve_bancaire: {
    type: "object",
    properties: {
      banque:       { type: "string" },
      titulaire:    { type: ["string","null"] },
      iban:         { type: ["string","null"] },
      solde:        { type: ["number","null"], description: "Solde en euros, nombre décimal" },
      date_releve:  { type: ["string","null"], description: "Date ISO YYYY-MM-DD" },
      type_compte:  { type: ["string","null"], description: "courant | epargne | titre | autre" }
    }
  },
  titre_propriete: {
    type: "object",
    properties: {
      adresse:      { type: "string" },
      type_bien:    { type: ["string","null"], description: "maison | appartement | terrain | local_commercial | autre" },
      surface:      { type: ["number","null"], description: "Surface en m²" },
      nature_droit: { type: "string", description: "pleine_propriete | usufruit | nue_propriete | indivision", default: "pleine_propriete" },
      quote_part:   { type: "number", description: "Pourcentage détenu, ex: 100 ou 50", default: 100 },
      date_acte:    { type: ["string","null"] },
      valeur_acte:  { type: ["number","null"], description: "Valeur mentionnée dans l'acte en euros" }
    }
  },
  assurance_vie: {
    type: "object",
    properties: {
      compagnie:              { type: "string" },
      num_contrat:            { type: ["string","null"] },
      capital:                { type: ["number","null"], description: "Capital décès en euros" },
      beneficiaires:          { type: "array", items: { type: "string" }, description: "Liste des bénéficiaires" },
      versement_apres_70_ans: { type: ["boolean","null"], description: "true si des primes ont été versées après les 70 ans du souscripteur" }
    }
  },
  acte_donation: {
    type: "object",
    properties: {
      date_donation:           { type: ["string","null"], description: "Date ISO YYYY-MM-DD" },
      donateur:                { type: "string" },
      beneficiaire:            { type: "string" },
      type_donation:           { type: ["string","null"], description: "somme | immobilier | titre | autre" },
      montant:                 { type: ["number","null"] },
      enregistree_fiscalement: { type: ["boolean","null"] }
    }
  },
  justificatif_dette: {
    type: "object",
    properties: {
      type_dette:   { type: ["string","null"], description: "emprunt | facture | impot | funeraire | autre" },
      creancier:    { type: "string" },
      montant:      { type: ["number","null"] },
      date_origine: { type: ["string","null"] }
    }
  },
  releve_portefeuille: {
    type: "object",
    properties: {
      courtier:     { type: "string" },
      titulaire:    { type: ["string","null"] },
      type_compte:  { type: ["string","null"], description: "PEA | CTO | assurance_vie_uc | autre" },
      valorisation: { type: ["number","null"], description: "Valorisation totale en euros" },
      date_releve:  { type: ["string","null"] }
    }
  },
  livret_famille: {
    type: "object",
    properties: {
      defunt:  { type: ["object","null"] },
      conjoint:{ type: ["object","null"] },
      enfants: { type: "array", items: { type: "object", properties: {
        full_name:  { type: "string" },
        birth_date: { type: ["string","null"] }
      }}}
    }
  },
  autre: {
    type: "object",
    properties: {
      type_detecte:   { type: ["string","null"] },
      contenu_resume: { type: "string", description: "Résumé du contenu en 2-3 phrases" }
    }
  }
}
