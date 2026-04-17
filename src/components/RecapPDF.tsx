import { useEffect, useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { ASSET_TYPES } from "@/lib/actifConfigs";

// ─── Types ───
interface Defunt {
  full_name: string | null;
  birth_date: string | null;
  death_date: string | null;
  death_place: string | null;
  domicile: string | null;
  nationality: string | null;
  marital_status: string | null;
  matrimonial_regime: string | null;
}
interface Heritier {
  full_name: string | null;
  lien_parente: string | null;
  birth_date: string | null;
  status: string | null;
}
interface ActifItem {
  id: string;
  type_bien: string | null;
  libelle: string | null;
  valeur_estimee: number | null;
}
interface PassifItem {
  id: string;
  type_dette: string | null;
  libelle: string | null;
  montant: number | null;
}
interface Donation {
  id: string;
  beneficiaire_name: string | null;
  date_donation: string | null;
  type_donation: string | null;
  montant: number | null;
  dans_15_ans: boolean | null;
}

// ─── Hook de chargement ───
export interface RecapData {
  defunt: Defunt | null;
  heritiers: Heritier[];
  actifs: ActifItem[];
  passifs: PassifItem[];
  donations: Donation[];
}

export function useRecapData(declarationId: string | null) {
  const [data, setData] = useState<RecapData | null>(null);

  useEffect(() => {
    if (!declarationId) return;
    let cancelled = false;
    (async () => {
      const [d, h, a, p, don] = await Promise.all([
        supabase.from("defunts").select("*").eq("declaration_id", declarationId).maybeSingle(),
        supabase.from("heritiers").select("*").eq("declaration_id", declarationId).order("ordre"),
        supabase.from("actif_items").select("*").eq("declaration_id", declarationId),
        supabase.from("passif_items").select("*").eq("declaration_id", declarationId),
        supabase.from("donations").select("*").eq("declaration_id", declarationId),
      ]);
      if (cancelled) return;
      setData({
        defunt: (d.data as unknown as Defunt) ?? null,
        heritiers: (h.data as unknown as Heritier[]) ?? [],
        actifs: (a.data as unknown as ActifItem[]) ?? [],
        passifs: (p.data as unknown as PassifItem[]) ?? [],
        donations: (don.data as unknown as Donation[]) ?? [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [declarationId]);

  return data;
}

// ─── Helpers ───
const fmtEuro = (n: number | null | undefined) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const fmtDate = (d: string | null | undefined) =>
  d ? format(new Date(d), "dd/MM/yyyy", { locale: fr }) : "—";

// ─── Styles ───
const COLOR_PRIMARY = "#1a2238";
const COLOR_ACCENT = "#c9a961";
const COLOR_BEIGE = "#f5efe1";
const COLOR_RED_LIGHT = "#fdecec";
const COLOR_BORDER = "#dcdcdc";

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#333",
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: 350,
    left: 100,
    fontSize: 90,
    color: "#000000",
    opacity: 0.12,
    transform: "rotate(-30deg)",
    fontFamily: "Helvetica-Bold",
  },
  brand: {
    position: "absolute",
    top: 30,
    left: 40,
    fontSize: 24,
    color: COLOR_PRIMARY,
    fontFamily: "Helvetica-Bold",
  },
  pageNum: {
    position: "absolute",
    bottom: 20,
    right: 40,
    fontSize: 9,
    color: "#999",
  },
  h1: {
    fontSize: 20,
    color: COLOR_PRIMARY,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  h2: {
    fontSize: 14,
    color: COLOR_PRIMARY,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
    marginTop: 4,
  },
  subtitle: { fontSize: 12, color: "#555", marginBottom: 24 },
  paragraph: { marginBottom: 6, lineHeight: 1.4 },
  noticeBox: {
    backgroundColor: COLOR_BEIGE,
    padding: 14,
    borderRadius: 4,
    marginTop: 24,
    fontSize: 10,
    lineHeight: 1.5,
  },
  warningBox: {
    backgroundColor: COLOR_RED_LIGHT,
    padding: 12,
    borderRadius: 4,
    marginTop: 16,
    fontSize: 9,
    lineHeight: 1.5,
  },
  // Tables
  table: { marginTop: 8, borderWidth: 1, borderColor: COLOR_BORDER },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLOR_BORDER },
  trLast: { flexDirection: "row" },
  th: {
    backgroundColor: COLOR_PRIMARY,
    color: "#fff",
    padding: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  td: { padding: 6, fontSize: 9 },
  tdRight: { padding: 6, fontSize: 9, textAlign: "right" },
  tdBold: { padding: 6, fontSize: 10, fontFamily: "Helvetica-Bold" },
  tdBoldRight: { padding: 6, fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "right" },
  subtotalRow: {
    flexDirection: "row",
    backgroundColor: "#f5f3ee",
    borderBottomWidth: 1,
    borderBottomColor: COLOR_BORDER,
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: COLOR_ACCENT,
  },
  // Estimation
  estLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    fontSize: 11,
  },
  estLineBold: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLOR_PRIMARY,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: COLOR_BORDER,
    marginVertical: 8,
  },
  checklistItem: {
    flexDirection: "row",
    marginBottom: 8,
    fontSize: 11,
  },
  checkbox: { marginRight: 8, fontFamily: "Helvetica-Bold" },
});

// Column width helpers
const col = (pct: number) => ({ width: `${pct}%` as any });

// ─── Composant ───
export interface RecapPDFProps {
  declarationId: string;
  data?: RecapData; // optional pre-loaded
}

export const RecapPDFDocument = ({ data }: { data: RecapData }) => {
  const { defunt, heritiers, actifs, passifs, donations } = data;

  // Calculations
  const actifsByType = ASSET_TYPES.map((t) => {
    const items = actifs.filter((i) => i.type_bien === t.key);
    const total = items.reduce((s, i) => s + Number(i.valeur_estimee || 0), 0);
    return { ...t, items, total };
  }).filter((g) => g.items.length > 0);

  const actifBrut = actifs.reduce((s, i) => s + Number(i.valeur_estimee || 0), 0);
  const passifTotal = passifs.reduce((s, i) => s + Number(i.montant || 0), 0);
  const actifNet = actifBrut - passifTotal;
  const rappelDonations = donations
    .filter((d) => d.dans_15_ans)
    .reduce((s, d) => s + Number(d.montant || 0), 0);
  const actifImposable = actifNet + rappelDonations;
  const estBasse = Math.max(0, actifImposable * 0.04);
  const estMoyenne = Math.max(0, actifImposable * 0.05);
  const estHaute = Math.max(0, actifImposable * 0.06);

  const donations15 = donations.filter((d) => d.dans_15_ans);

  // Checklist dynamique
  const checklist: string[] = [
    "Acte de décès (original + 3 copies)",
    "Livret de famille du défunt",
    "Pièce d'identité de chaque héritier",
    "Formulaires CERFA 2705-SD et 2705-S-SD complétés",
  ];
  if (actifs.some((a) => a.type_bien === "compte_bancaire" || a.type_bien === "compte"))
    checklist.push("Relevés bancaires au jour du décès");
  if (actifs.some((a) => a.type_bien === "immobilier"))
    checklist.push("Titre de propriété et évaluation du bien");
  if (actifs.some((a) => a.type_bien === "vehicule"))
    checklist.push("Carte grise ou certificat Argus");
  if (actifs.some((a) => a.type_bien === "titres" || a.type_bien === "titre"))
    checklist.push("Relevé de portefeuille au jour du décès");
  if (actifs.some((a) => a.type_bien === "assurance_vie"))
    checklist.push("Contrats d'assurance-vie + formulaire 2705-A-SD");
  if (passifs.length > 0) checklist.push("Justificatifs de dettes");
  if (donations15.length > 0) checklist.push("Actes de donation (<15 ans)");

  const today = format(new Date(), "dd MMMM yyyy", { locale: fr });

  const Watermark = () => <Text style={styles.watermark} fixed>BROUILLON</Text>;
  const Brand = () => <Text style={styles.brand} fixed>Déesse</Text>;

  return (
    <Document>
      {/* PAGE 1 — Garde */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <Brand />
        <View style={{ marginTop: 200 }}>
          <Text style={styles.h1}>Déclaration de succession</Text>
          <Text style={[styles.subtitle, { marginBottom: 8 }]}>Document préparatoire</Text>
          <Text style={{ fontSize: 11, color: "#777" }}>Généré le {today}</Text>
        </View>
        <View style={styles.noticeBox}>
          <Text>
            Ce document est un outil d'aide à la saisie. Il ne constitue pas un acte
            notarié ni un conseil juridique. La déclaration officielle se compose des
            formulaires CERFA 2705-SD, 2705-S-SD et le cas échéant 2705-A-SD, à déposer
            auprès du SPFE/SDE du domicile du défunt.
          </Text>
        </View>
      </Page>

      {/* PAGE 2 — Défunt */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <Brand />
        <View style={{ marginTop: 60 }}>
          <Text style={styles.h2}>1. Le défunt</Text>
          <View style={styles.table}>
            {[
              ["Nom et prénoms", defunt?.full_name ?? "—"],
              ["Date de naissance", fmtDate(defunt?.birth_date)],
              ["Date de décès", fmtDate(defunt?.death_date)],
              ["Lieu de décès", defunt?.death_place ?? "—"],
              ["Domicile", defunt?.domicile ?? "—"],
              ["Nationalité", defunt?.nationality ?? "—"],
              ["Situation matrimoniale", defunt?.marital_status ?? "—"],
              ["Régime matrimonial", defunt?.matrimonial_regime ?? "—"],
            ].map(([label, value], i, arr) => (
              <View key={i} style={i === arr.length - 1 ? styles.trLast : styles.tr}>
                <View style={[col(40), { backgroundColor: "#f8f8f8" }]}>
                  <Text style={[styles.tdBold]}>{label}</Text>
                </View>
                <View style={col(60)}>
                  <Text style={styles.td}>{value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* PAGE 3 — Héritiers */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <Brand />
        <View style={{ marginTop: 60 }}>
          <Text style={styles.h2}>2. Les héritiers</Text>
          {heritiers.length === 0 ? (
            <Text style={styles.paragraph}>Aucun héritier renseigné.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tr}>
                <View style={col(35)}><Text style={styles.th}>Nom & prénoms</Text></View>
                <View style={col(25)}><Text style={styles.th}>Lien de parenté</Text></View>
                <View style={col(20)}><Text style={styles.th}>Date de naissance</Text></View>
                <View style={col(20)}><Text style={styles.th}>Statut</Text></View>
              </View>
              {heritiers.map((h, i) => (
                <View key={i} style={i === heritiers.length - 1 ? styles.trLast : styles.tr}>
                  <View style={col(35)}><Text style={styles.td}>{h.full_name ?? "—"}</Text></View>
                  <View style={col(25)}><Text style={styles.td}>{h.lien_parente ?? "—"}</Text></View>
                  <View style={col(20)}><Text style={styles.td}>{fmtDate(h.birth_date)}</Text></View>
                  <View style={col(20)}><Text style={styles.td}>{h.status ?? "—"}</Text></View>
                </View>
              ))}
            </View>
          )}
        </View>
        <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* PAGE 4 — Actif */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <Brand />
        <View style={{ marginTop: 60 }}>
          <Text style={styles.h2}>3. L'actif</Text>
          {actifsByType.length === 0 ? (
            <Text style={styles.paragraph}>Aucun actif renseigné.</Text>
          ) : (
            actifsByType.map((g) => (
              <View key={g.key} style={{ marginBottom: 14 }} wrap={false}>
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: COLOR_PRIMARY, marginBottom: 4 }}>
                  {g.label}
                </Text>
                <View style={styles.table}>
                  <View style={styles.tr}>
                    <View style={col(70)}><Text style={styles.th}>Libellé</Text></View>
                    <View style={col(30)}><Text style={[styles.th, { textAlign: "right" }]}>Valeur estimée</Text></View>
                  </View>
                  {g.items.map((i, idx) => (
                    <View key={i.id} style={idx === g.items.length - 1 ? styles.trLast : styles.tr}>
                      <View style={col(70)}><Text style={styles.td}>{i.libelle ?? "—"}</Text></View>
                      <View style={col(30)}><Text style={styles.tdRight}>{fmtEuro(i.valeur_estimee)}</Text></View>
                    </View>
                  ))}
                  <View style={styles.subtotalRow}>
                    <View style={col(70)}><Text style={styles.tdBold}>Sous-total {g.label}</Text></View>
                    <View style={col(30)}><Text style={styles.tdBoldRight}>{fmtEuro(g.total)}</Text></View>
                  </View>
                </View>
              </View>
            ))
          )}
          <View style={[styles.totalRow, { marginTop: 8 }]}>
            <View style={col(70)}><Text style={styles.tdBold}>TOTAL ACTIF BRUT</Text></View>
            <View style={col(30)}><Text style={styles.tdBoldRight}>{fmtEuro(actifBrut)}</Text></View>
          </View>
        </View>
        <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* PAGE 5 — Passif */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <Brand />
        <View style={{ marginTop: 60 }}>
          <Text style={styles.h2}>4. Le passif</Text>
          {passifs.length === 0 ? (
            <Text style={styles.paragraph}>Aucune dette renseignée.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tr}>
                <View style={col(45)}><Text style={styles.th}>Libellé</Text></View>
                <View style={col(30)}><Text style={styles.th}>Type de dette</Text></View>
                <View style={col(25)}><Text style={[styles.th, { textAlign: "right" }]}>Montant</Text></View>
              </View>
              {passifs.map((p, i) => (
                <View key={p.id} style={i === passifs.length - 1 ? styles.trLast : styles.tr}>
                  <View style={col(45)}><Text style={styles.td}>{p.libelle ?? "—"}</Text></View>
                  <View style={col(30)}><Text style={styles.td}>{p.type_dette ?? "—"}</Text></View>
                  <View style={col(25)}><Text style={styles.tdRight}>{fmtEuro(p.montant)}</Text></View>
                </View>
              ))}
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: 8 }]}>
            <View style={col(75)}><Text style={styles.tdBold}>TOTAL PASSIF</Text></View>
            <View style={col(25)}><Text style={styles.tdBoldRight}>{fmtEuro(passifTotal)}</Text></View>
          </View>
        </View>
        <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* PAGE 6 — Donations (si applicable) */}
      {donations15.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Watermark />
          <Brand />
          <View style={{ marginTop: 60 }}>
            <Text style={styles.h2}>5. Donations antérieures (rappel fiscal)</Text>
            <View style={styles.table}>
              <View style={styles.tr}>
                <View style={col(35)}><Text style={styles.th}>Bénéficiaire</Text></View>
                <View style={col(20)}><Text style={styles.th}>Date</Text></View>
                <View style={col(20)}><Text style={styles.th}>Type</Text></View>
                <View style={col(25)}><Text style={[styles.th, { textAlign: "right" }]}>Montant</Text></View>
              </View>
              {donations15.map((d, i) => (
                <View key={d.id} style={i === donations15.length - 1 ? styles.trLast : styles.tr}>
                  <View style={col(35)}><Text style={styles.td}>{d.beneficiaire_name ?? "—"}</Text></View>
                  <View style={col(20)}><Text style={styles.td}>{fmtDate(d.date_donation)}</Text></View>
                  <View style={col(20)}><Text style={styles.td}>{d.type_donation ?? "—"}</Text></View>
                  <View style={col(25)}><Text style={styles.tdRight}>{fmtEuro(d.montant)}</Text></View>
                </View>
              ))}
            </View>
            <View style={[styles.totalRow, { marginTop: 8 }]}>
              <View style={col(75)}><Text style={styles.tdBold}>Rappel fiscal total</Text></View>
              <View style={col(25)}><Text style={styles.tdBoldRight}>{fmtEuro(rappelDonations)}</Text></View>
            </View>
            <Text style={[styles.paragraph, { marginTop: 12, fontStyle: "italic", color: "#666" }]}>
              Note : Les donations de plus de 15 ans ne figurent pas dans ce tableau.
            </Text>
          </View>
          <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* PAGE 7 — Estimation fiscale */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <Brand />
        <View style={{ marginTop: 60 }}>
          <Text style={styles.h2}>{donations15.length > 0 ? "6" : "5"}. Estimation fiscale</Text>
          <View style={{ marginTop: 8 }}>
            <View style={styles.estLine}>
              <Text>Actif brut</Text>
              <Text>{fmtEuro(actifBrut)}</Text>
            </View>
            <View style={styles.estLine}>
              <Text>Passif</Text>
              <Text>− {fmtEuro(passifTotal)}</Text>
            </View>
            <View style={styles.estLine}>
              <Text>Actif net</Text>
              <Text>= {fmtEuro(actifNet)}</Text>
            </View>
            <View style={styles.estLine}>
              <Text>Rappel donations</Text>
              <Text>+ {fmtEuro(rappelDonations)}</Text>
            </View>
            <View style={styles.estLineBold}>
              <Text>Actif imposable</Text>
              <Text>= {fmtEuro(actifImposable)}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.estLine}>
              <Text>Estimation basse (4 %)</Text>
              <Text>{fmtEuro(estBasse)}</Text>
            </View>
            <View style={styles.estLine}>
              <Text>Estimation moyenne (5 %)</Text>
              <Text>{fmtEuro(estMoyenne)}</Text>
            </View>
            <View style={styles.estLine}>
              <Text>Estimation haute (6 %)</Text>
              <Text>{fmtEuro(estHaute)}</Text>
            </View>
          </View>
          <View style={styles.warningBox}>
            <Text>
              Estimation indicative ne tenant pas compte des abattements individuels par
              héritier ni des exonérations spécifiques (conjoint survivant, partenaire
              PACS…). Le calcul officiel est réalisé par la DGFIP.
            </Text>
          </View>
        </View>
        <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* PAGE 8 — Checklist */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <Brand />
        <View style={{ marginTop: 60 }}>
          <Text style={styles.h2}>{donations15.length > 0 ? "7" : "6"}. Pièces à réunir</Text>
          {checklist.map((c, i) => (
            <View key={i} style={styles.checklistItem}>
              <Text style={styles.checkbox}>☐</Text>
              <Text>{c}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
};

// Wrapper qui charge les données depuis Supabase
const RecapPDF = ({ declarationId }: RecapPDFProps) => {
  const data = useRecapData(declarationId);
  if (!data) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Chargement…</Text>
        </Page>
      </Document>
    );
  }
  return <RecapPDFDocument data={data} />;
};

export default RecapPDF;
