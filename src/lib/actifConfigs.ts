import { z } from "zod";
import { AlertTriangle, Info } from "lucide-react";

// ─── Type definitions ───
export const ASSET_TYPES = [
  { key: "compte_bancaire", label: "Comptes bancaires et livrets" },
  { key: "immobilier", label: "Immobilier" },
  { key: "vehicule", label: "Véhicules" },
  { key: "titres", label: "Titres et portefeuilles" },
  { key: "entreprise", label: "Entreprise" },
  { key: "assurance_vie", label: "Assurance-vie" },
  { key: "crypto", label: "Crypto-actifs" },
  { key: "autre", label: "Autres biens et créances diverses" },
] as const;

export type AssetTypeKey = (typeof ASSET_TYPES)[number]["key"];

// ─── Field definition for dynamic form rendering ───
export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "radio" | "file" | "checkbox";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  suffix?: string;
  colSpan?: 1 | 2;
  defaultValue?: any;
  /** Show this field only when the predicate is true (based on current form values). */
  showIf?: (values: Record<string, any>) => boolean;
  /** Optional info banner shown under the field when predicate is true. */
  info?: { message: string; when?: (values: Record<string, any>) => boolean };
}

export interface AssetAlert {
  type: "warning" | "info";
  condition?: (values: Record<string, any>) => boolean;
  message: string;
  icon: typeof AlertTriangle | typeof Info;
}

export interface AssetTypeConfig {
  fields: FieldDef[];
  alerts?: AssetAlert[];
  valeurField: string; // which field maps to valeur_estimee
}

// ─── Configs per type ───
export const ASSET_CONFIGS: Record<AssetTypeKey, AssetTypeConfig> = {
  compte_bancaire: {
    valeurField: "valeur_estimee",
    fields: [
      {
        name: "banque_nom",
        label: "Nom de l'établissement bancaire",
        type: "text",
        required: true,
        placeholder: "Caisse d'Epargne Rhône Alpes - Service Successions",
        colSpan: 2,
      },
      {
        name: "banque_adresse",
        label: "Adresse de la banque",
        type: "textarea",
        required: true,
        placeholder: "Tour INCITY 116 Boulevard Lafayette BP 3276 69404 LYON CEDEX 03",
        colSpan: 2,
      },
      {
        name: "type_compte_precis",
        label: "Type de compte",
        type: "select",
        required: true,
        colSpan: 2,
        options: [
          { value: "livret_a", label: "Livret A" },
          { value: "livret_b", label: "Livret B" },
          { value: "livret_jeune", label: "Livret Jeune" },
          { value: "ldds", label: "Livret de développement durable et solidaire (LDDS)" },
          { value: "lep", label: "Livret d'épargne populaire (LEP)" },
          { value: "pel", label: "Plan d'épargne logement (PEL)" },
          { value: "cel", label: "Compte épargne logement (CEL)" },
          { value: "compte_depot", label: "Compte de dépôt" },
          { value: "compte_courant", label: "Compte courant" },
          { value: "compte_titres", label: "Compte titres ordinaires" },
          { value: "pea", label: "PEA" },
          { value: "pea_pme", label: "PEA-PME" },
          { value: "autre", label: "Autre" },
        ],
      },
      {
        name: "numero_compte",
        label: "Numéro de compte",
        type: "text",
        required: true,
        placeholder: "Ex : 00200-00294483209",
        colSpan: 2,
      },
      {
        name: "valeur_estimee",
        label: "Solde au jour du décès (€)",
        type: "number",
        required: true,
        suffix: "€",
        colSpan: 2,
      },
      {
        name: "detenu_en_indivision",
        label: "Compte détenu en indivision",
        type: "checkbox",
        defaultValue: false,
        colSpan: 2,
      },
      {
        name: "quote_part_pct",
        label: "Quote-part du défunt (%)",
        type: "number",
        required: true,
        defaultValue: 50,
        colSpan: 2,
        showIf: (v) => v.detenu_en_indivision === true,
      },
    ],
    alerts: [
      {
        type: "info",
        icon: Info,
        condition: (v) => v.detenu_en_indivision === true,
        message:
          "En cas d'indivision, le solde porté ci-dessus doit correspondre à la quote-part du défunt et non au solde total du compte. Indiquez la quote-part en % pour que la déclaration mentionne la détention partielle.",
      },
    ],
  },

  immobilier: {
    valeurField: "valeur_estimee",
    fields: [
      { name: "libelle", label: "Libellé", type: "text", required: true, placeholder: "Maison principale Marseille" },
      { name: "type_immo", label: "Type", type: "select", required: true, options: [
        { value: "Maison", label: "Maison" },
        { value: "Appartement", label: "Appartement" },
        { value: "Terrain", label: "Terrain" },
        { value: "Local commercial", label: "Local commercial" },
        { value: "Autre", label: "Autre" },
      ]},
      { name: "adresse", label: "Adresse complète", type: "text", required: true, colSpan: 2 },
      { name: "surface", label: "Surface (m²)", type: "number", placeholder: "120" },
      { name: "nature_droit", label: "Nature du droit", type: "select", required: true, options: [
        { value: "Pleine propriété", label: "Pleine propriété" },
        { value: "Usufruit", label: "Usufruit" },
        { value: "Nue-propriété", label: "Nue-propriété" },
        { value: "Indivision", label: "Indivision" },
      ]},
      { name: "quote_part", label: "Quote-part du défunt (%)", type: "number", required: true, placeholder: "100" },
      { name: "valeur_estimee", label: "Valeur estimée (€)", type: "number", required: true, suffix: "€" },
    ],
    alerts: [
      {
        type: "warning",
        icon: AlertTriangle,
        condition: (v) => Number(v.valeur_estimee) > 100000,
        message: "Valeur importante détectée. Nous vous recommandons de faire évaluer ce bien par un professionnel (expert ou notaire) avant dépôt.",
      },
    ],
  },

  vehicule: {
    valeurField: "valeur_argus",
    fields: [
      { name: "libelle", label: "Libellé", type: "text", required: true, placeholder: "Peugeot 208 2018" },
      { name: "marque", label: "Marque", type: "text", required: true },
      { name: "modele", label: "Modèle", type: "text", required: true },
      { name: "annee", label: "Année", type: "number", placeholder: "2018" },
      { name: "immatriculation", label: "Immatriculation", type: "text", placeholder: "AB-123-CD" },
      { name: "valeur_argus", label: "Valeur Argus (€)", type: "number", required: true, suffix: "€" },
    ],
  },

  titres: {
    valeurField: "quote_part_eur",
    fields: [
      { name: "libelle", label: "Libellé", type: "text", required: true, placeholder: "PEA Boursorama" },
      { name: "courtier", label: "Nom du courtier / banque", type: "text", required: true },
      { name: "type_titre", label: "Type", type: "select", required: true, options: [
        { value: "PEA", label: "PEA" },
        { value: "CTO", label: "CTO" },
        { value: "Assurance-vie en UC", label: "Assurance-vie en UC" },
        { value: "Autre", label: "Autre" },
      ]},
      { name: "nature_droit", label: "Nature du droit", type: "select", required: true, options: [
        { value: "Pleine propriété", label: "Pleine propriété" },
        { value: "Indivision", label: "Indivision" },
        { value: "Usufruit", label: "Usufruit" },
        { value: "Nue-propriété", label: "Nue-propriété" },
      ]},
      { name: "quote_part", label: "Quote-part du défunt (%)", type: "number", required: true, placeholder: "100" },
      { name: "valorisation", label: "Valorisation totale du portefeuille (€)", type: "number", required: true, suffix: "€" },
      { name: "quote_part_eur", label: "Quote-part en € (calculée automatiquement)", type: "number", suffix: "€" },
    ],
    alerts: [
      {
        type: "info",
        icon: Info,
        condition: (v) => v.nature_droit === "Indivision" && Number(v.quote_part) < 100,
        message: "Compte-titres en indivision : seule la quote-part du défunt entre dans l'actif successoral.",
      },
    ],
  },

  entreprise: {
    valeurField: "valorisation",
    fields: [
      { name: "libelle", label: "Libellé", type: "text", required: true, placeholder: "Parts SARL Dupont" },
      { name: "forme_juridique", label: "Forme juridique", type: "text", required: true, placeholder: "SARL, SAS, SCI…" },
      { name: "pct_detenu", label: "% détenu", type: "number", required: true, placeholder: "100" },
      { name: "valorisation", label: "Valorisation estimée (€)", type: "number", required: true, suffix: "€" },
    ],
    alerts: [
      {
        type: "warning",
        icon: AlertTriangle,
        message: "La valorisation d'une entreprise non cotée nécessite généralement un expert-comptable ou un notaire. La valeur que vous saisissez est une estimation — prévoyez une validation professionnelle avant dépôt.",
      },
    ],
  },

  assurance_vie: {
    valeurField: "capital_deces",
    fields: [
      { name: "libelle", label: "Libellé", type: "text", required: true, placeholder: "AV Predica" },
      { name: "compagnie", label: "Compagnie", type: "text", required: true },
      { name: "numero_contrat", label: "N° contrat", type: "text" },
      { name: "capital_deces", label: "Capital décès (€)", type: "number", required: true, suffix: "€" },
      { name: "beneficiaires", label: "Bénéficiaires", type: "textarea", placeholder: "Noms des bénéficiaires désignés…", colSpan: 2 },
      { name: "date_primes", label: "Date de versement des primes", type: "radio", required: true, options: [
        { value: "avant_70", label: "Avant 70 ans" },
        { value: "apres_70", label: "Après 70 ans" },
        { value: "mixte", label: "Mixte" },
        { value: "inconnu", label: "Je ne sais pas" },
      ]},
    ],
    alerts: [
      {
        type: "info",
        icon: Info,
        condition: (v) => v.date_primes === "apres_70" || v.date_primes === "mixte",
        message: "Les primes versées après 70 ans sont soumises à un régime fiscal particulier et feront l'objet d'une annexe 2705-A-SD.",
      },
    ],
  },

  crypto: {
    valeurField: "valorisation",
    fields: [
      { name: "libelle", label: "Libellé", type: "text", required: true, placeholder: "Portefeuille Coinbase" },
      { name: "plateforme", label: "Plateforme", type: "text", required: true },
      { name: "nature_crypto", label: "Nature", type: "select", required: true, options: [
        { value: "BTC", label: "BTC" },
        { value: "ETH", label: "ETH" },
        { value: "Stablecoin", label: "Stablecoin" },
        { value: "Autre", label: "Autre" },
      ]},
      { name: "valorisation", label: "Valorisation au décès (€)", type: "number", required: true, suffix: "€" },
    ],
    alerts: [
      {
        type: "info",
        icon: Info,
        message: "Le traitement fiscal des crypto-actifs dans le cadre d'une succession est une matière en évolution. Prévoyez de conserver une capture d'écran datée du portefeuille au jour du décès.",
      },
    ],
  },

  autre: {
    valeurField: "valeur_estimee",
    fields: [
      { name: "libelle", label: "Libellé", type: "text", required: true, placeholder: "Bijoux, œuvres d'art…" },
      { name: "type_autre", label: "Type", type: "select", required: true, options: [
        { value: "Créance", label: "Créance (somme due au défunt — caution, EHPAD, particulier...)" },
        { value: "Mobilier", label: "Mobilier / objets domestiques" },
        { value: "Bijoux", label: "Bijoux" },
        { value: "Œuvre d'art", label: "Œuvre d'art / collection" },
        { value: "Remboursement", label: "Remboursement (impôt, mutuelle, salaire)" },
        { value: "Autre", label: "Autre — préciser dans la description" },
      ]},
      { name: "description", label: "Description", type: "textarea", colSpan: 2 },
      { name: "valeur_estimee", label: "Valeur estimée (€)", type: "number", required: true, suffix: "€" },
    ],
    alerts: [
      {
        type: "info",
        icon: Info,
        condition: (v) => v.type_autre === "Créance",
        message: "Les créances (sommes dues au défunt) font partie de l'actif successoral. Conservez le justificatif.",
      },
    ],
  },
};

// ─── Dynamic zod schema builder ───
export function buildSchema(config: AssetTypeConfig) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of config.fields) {
    if (f.type === "file") continue;
    let s: z.ZodTypeAny;
    if (f.type === "number") {
      s = f.required
        ? z.coerce.number({ required_error: `${f.label} est requis` }).positive(`${f.label} doit être positif`)
        : z.coerce.number().positive().optional().or(z.literal("")).or(z.literal(0));
    } else {
      s = f.required
        ? z.string().trim().min(1, `${f.label} est requis`).max(500)
        : z.string().trim().max(500).optional().or(z.literal(""));
    }
    shape[f.name] = s;
  }
  return z.object(shape);
}
