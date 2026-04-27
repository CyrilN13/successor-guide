export const ABATTEMENTS: Record<string, number> = {
  conjoint:        Infinity,
  pacs:            Infinity,
  enfant:          100000,
  parent:          100000,
  petit_enfant:    1594,
  arriere_pp:      1594,
  frere_soeur:     15932,
  neveu_niece:     7967,
  autre:           1594,
  handicape_bonus: 159325,
}

export const BAREME_LIGNE_DIRECTE = [
  { jusqu_a:    8072, taux: 0.05 },
  { jusqu_a:   12109, taux: 0.10 },
  { jusqu_a:   15932, taux: 0.15 },
  { jusqu_a:  552324, taux: 0.20 },
  { jusqu_a:  902838, taux: 0.30 },
  { jusqu_a: 1805677, taux: 0.40 },
  { jusqu_a: Infinity, taux: 0.45 },
]

export const BAREME_FRERE_SOEUR = [
  { jusqu_a:  24430, taux: 0.35 },
  { jusqu_a: Infinity, taux: 0.45 },
]

export const TAUX_NEVEU_NIECE = 0.55
export const TAUX_NON_PARENT = 0.60

export function lienToKey(lien: string | null): string {
  switch (lien) {
    case "Enfant": return "enfant"
    case "Conjoint survivant": return "conjoint"
    case "Parent": return "parent"
    case "Frère/Sœur": return "frere_soeur"
    case "Neveu/Nièce": return "neveu_niece"
    case "Petit-enfant": return "petit_enfant"
    case "Partenaire PACS": return "pacs"
    default: return "autre"
  }
}
