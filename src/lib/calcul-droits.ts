import { ABATTEMENTS, BAREME_LIGNE_DIRECTE, BAREME_FRERE_SOEUR, TAUX_NEVEU_NIECE, TAUX_NON_PARENT, lienToKey } from "./fiscal-2026"

function appliquerBareme(base: number, bareme: { jusqu_a: number; taux: number }[]) {

  if (base <= 0) return { droits: 0, taux: 0 }

  let droits = 0, pris = 0, tauxMarginal = 0

  for (const tranche of bareme) {

    const a_taxer = Math.min(tranche.jusqu_a - pris, base - pris)

    if (a_taxer <= 0) break

    droits += a_taxer * tranche.taux

    pris += a_taxer

    tauxMarginal = tranche.taux

    if (pris >= base) break

  }

  return { droits, taux: tauxMarginal }

}

export function calculerDroits(actifBrut: number, passifTotal: number, rappelDonations: number, heritiers: any[]) {

  const actifNet = actifBrut - passifTotal

  const actifImposable = actifNet + rappelDonations

  const acceptants = heritiers.filter(h => h.status !== "renonce" && h.status !== "renoncant")

  if (acceptants.length === 0) {

    return { actif_brut: actifBrut, passif_total: passifTotal, actif_net: actifNet, rappel_donations: rappelDonations, actif_imposable: actifImposable, par_heritier: [], total_droits: 0, hors_periphere: true, reason_hors_perimetre: "Aucun héritier acceptant" }

  }

  const partUnitaire = actifImposable / acceptants.length

  const par_heritier = acceptants.map(h => {

    const key = lienToKey(h.lien_parente)

    const abattementBase = ABATTEMENTS[key] ?? ABATTEMENTS.autre

    const exonere = !isFinite(abattementBase)

    if (exonere) return { nom: h.full_name ?? "—", lien: h.lien_parente ?? "—", exonere: true, part_brute: partUnitaire, abattement: 0, base_imposable: 0, droits: 0, taux_marginal: 0 }

    let abattement = abattementBase

    if (h.handicape) abattement += ABATTEMENTS.handicape_bonus

    const base = Math.max(0, partUnitaire - abattement)

    let res: { droits: number; taux: number }

    switch (key) {

      case "enfant": case "parent": case "petit_enfant": case "arriere_pp":

        res = appliquerBareme(base, BAREME_LIGNE_DIRECTE); break

      case "frere_soeur":

        res = appliquerBareme(base, BAREME_FRERE_SOEUR); break

      case "neveu_niece":

        res = { droits: base * TAUX_NEVEU_NIECE, taux: TAUX_NEVEU_NIECE }; break

      default:

        res = { droits: base * TAUX_NON_PARENT, taux: TAUX_NON_PARENT }

    }

    return { nom: h.full_name ?? "—", lien: h.lien_parente ?? "—", exonere: false, part_brute: partUnitaire, abattement, base_imposable: base, droits: res.droits, taux_marginal: res.taux }

  })

  const total_droits = par_heritier.reduce((s, x) => s + x.droits, 0)

  return { actif_brut: actifBrut, passif_total: passifTotal, actif_net: actifNet, rappel_donations: rappelDonations, actif_imposable: actifImposable, par_heritier, total_droits, hors_periphere: false }

}
