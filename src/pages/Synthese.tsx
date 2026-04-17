import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, differenceInYears } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  FileDown,
  FileText,
  CheckSquare,
  Loader2,
  Info,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASSET_TYPES, type AssetTypeKey } from "@/lib/actifConfigs";
import { toast } from "sonner";

// ─── Types ───
interface Defunt {
  full_name: string | null;
  birth_date: string | null;
  death_date: string | null;
  death_place: string | null;
  domicile: string | null;
  marital_status: string | null;
  matrimonial_regime: string | null;
}
interface Heritier {
  full_name: string | null;
  lien_parente: string | null;
  status: string | null;
}
interface ActifItem {
  id: string;
  type_bien: string | null;
  libelle: string | null;
  valeur_estimee: number | null;
  details: Record<string, any> | null;
}
interface PassifItem {
  id: string;
  type_dette: string | null;
  libelle: string | null;
  montant: number | null;
  existait_au_deces: string | null;
  details: Record<string, any> | null;
}
interface Donation {
  id: string;
  beneficiaire_name: string | null;
  date_donation: string | null;
  type_donation: string | null;
  montant: number | null;
  dans_15_ans: boolean | null;
  enregistree_fiscalement: boolean | null;
}

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtDate = (d: string | null) =>
  d ? format(new Date(d), "dd/MM/yyyy", { locale: fr }) : "—";

const Synthese = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState(false);

  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [defunt, setDefunt] = useState<Defunt | null>(null);
  const [heritiers, setHeritiers] = useState<Heritier[]>([]);
  const [actifs, setActifs] = useState<ActifItem[]>([]);
  const [passifs, setPassifs] = useState<PassifItem[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);

  // ─── Load all data ───
  useEffect(() => {
    (async () => {
      const declId = localStorage.getItem("deesse_declaration_id");
      if (!declId) {
        navigate("/etape/1");
        return;
      }
      setDeclarationId(declId);

      const [d, h, a, p, don] = await Promise.all([
        supabase.from("defunts").select("*").eq("declaration_id", declId).maybeSingle(),
        supabase.from("heritiers").select("*").eq("declaration_id", declId).order("ordre"),
        supabase.from("actif_items").select("*").eq("declaration_id", declId),
        supabase.from("passif_items").select("*").eq("declaration_id", declId),
        supabase.from("donations").select("*").eq("declaration_id", declId),
      ]);

      if (d.data) setDefunt(d.data as unknown as Defunt);
      if (h.data) setHeritiers(h.data as unknown as Heritier[]);
      if (a.data) setActifs(a.data as unknown as ActifItem[]);
      if (p.data) setPassifs(p.data as unknown as PassifItem[]);
      if (don.data) setDonations(don.data as unknown as Donation[]);
      setLoading(false);
    })();
  }, [navigate]);

  // ─── Calculations ───
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
  const droitsBasse = Math.max(0, actifImposable * 0.04);
  const droitsMoyen = Math.max(0, actifImposable * 0.05);
  const droitsHaute = Math.max(0, actifImposable * 0.06);

  // ─── Alerts ───
  const alerts: { icon: typeof AlertTriangle; message: string }[] = [];
  const hasImmoLourd = actifs.some(
    (a) => a.type_bien === "immobilier" && Number(a.valeur_estimee || 0) > 100000
  );
  const hasEntreprise = actifs.some((a) => a.type_bien === "entreprise");
  const hasCrypto = actifs.some((a) => a.type_bien === "crypto");
  const hasAVApres70 = actifs.some(
    (a) =>
      a.type_bien === "assurance_vie" &&
      (a.details?.date_primes === "apres_70" || a.details?.date_primes === "mixte")
  );
  // Annexe CERFA 2705-A-SD : ne s'affiche que si au moins un actif AV a versement_apres_70_ans=true
  const hasAVAnnexe = actifs.some(
    (a) => a.type_bien === "assurance_vie" && a.details?.versement_apres_70_ans === true
  );
  const hasRenoncant = heritiers.some((h) => h.status === "renoncant");

  if (hasImmoLourd)
    alerts.push({
      icon: AlertTriangle,
      message:
        "Bien immobilier > 100 000 € : nous vous recommandons une évaluation professionnelle (expert ou notaire) avant dépôt.",
    });
  if (hasEntreprise)
    alerts.push({
      icon: AlertTriangle,
      message:
        "Présence d'une entreprise : la valorisation des parts sociales nécessite généralement un expert-comptable.",
    });
  if (hasCrypto)
    alerts.push({
      icon: Info,
      message:
        "Crypto-actifs déclarés : conservez une capture datée du portefeuille au jour du décès.",
    });
  if (hasAVApres70)
    alerts.push({
      icon: Info,
      message:
        "Assurance-vie avec primes versées après 70 ans : annexe CERFA 2705-A-SD à joindre à votre déclaration.",
    });
  if (hasRenoncant)
    alerts.push({
      icon: AlertTriangle,
      message:
        "Héritier renonçant détecté : la part revient aux héritiers de rang suivant — vérifiez les conséquences sur la dévolution.",
    });

  // ─── Checklist ───
  const checklist: string[] = ["Acte de décès (toujours requis)", "Livret de famille du défunt"];
  if (actifs.some((a) => a.type_bien === "immobilier"))
    checklist.push("Titres de propriété immobilière");
  if (actifs.some((a) => a.type_bien === "compte_bancaire"))
    checklist.push("Relevés bancaires à la date du décès");
  if (actifs.some((a) => a.type_bien === "assurance_vie"))
    checklist.push("Contrats d'assurance-vie et clauses bénéficiaires");
  if (actifs.some((a) => a.type_bien === "vehicule"))
    checklist.push("Cartes grises des véhicules");
  if (actifs.some((a) => a.type_bien === "titres"))
    checklist.push("Relevés de portefeuille titres au jour du décès");
  if (actifs.some((a) => a.type_bien === "entreprise"))
    checklist.push("Statuts et dernier bilan de la société");
  if (actifs.some((a) => a.type_bien === "crypto"))
    checklist.push("Capture des portefeuilles crypto au jour du décès");
  if (passifs.length > 0)
    checklist.push("Justificatifs des dettes (factures, tableaux d'amortissement…)");
  if (donations.length > 0)
    checklist.push("Actes de donation antérieurs (15 dernières années)");
  if (heritiers.length > 0) checklist.push("Pièces d'identité des héritiers");

  // ─── Snapshot + status update ───
  const persistSnapshot = useCallback(async () => {
    if (!declarationId) return;

    await (supabase.from("calculation_results") as any).upsert(
      {
        declaration_id: declarationId,
        actif_brut: actifBrut,
        passif_total: passifTotal,
        actif_net: actifNet,
        rappel_donations: rappelDonations,
        actif_imposable: actifImposable,
        estimation_basse: droitsBasse,
        estimation_moyenne: droitsMoyen,
        estimation_haute: droitsHaute,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "declaration_id" }
    );

    // Récupère purge_scheduled_at actuel — ne le réécrit que s'il est null
    const { data: declRow } = await supabase
      .from("declarations")
      .select("purge_scheduled_at")
      .eq("id", declarationId)
      .maybeSingle();

    const updatePayload: Record<string, any> = {
      status: "exported",
      current_step: 7,
    };
    if (!declRow?.purge_scheduled_at) {
      const purgeDate = new Date();
      purgeDate.setDate(purgeDate.getDate() + 90);
      updatePayload.purge_scheduled_at = purgeDate.toISOString();
    }

    await supabase.from("declarations").update(updatePayload).eq("id", declarationId);

    setExported(true);
  }, [
    declarationId,
    actifBrut,
    passifTotal,
    actifNet,
    rappelDonations,
    actifImposable,
    droitsBasse,
    droitsMoyen,
    droitsHaute,
  ]);

  // ─── Edge function CERFA download ───
  const handleCerfaDownload = async (type: "principal" | "av") => {
    if (!declarationId) return;
    const kind = type === "principal" ? "cerfa" : "cerfa-av";
    setExporting(kind);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cerfa", {
        body: { declarationId, type },
      });
      if (error) throw error;

      // data peut être un Blob (responseType binaire) ou un ArrayBuffer
      const blob =
        data instanceof Blob
          ? data
          : new Blob([data as ArrayBuffer], { type: "application/pdf" });

      const filename =
        type === "principal"
          ? "CERFA-2705-SD-Deesse.pdf"
          : "CERFA-2705-A-SD-Deesse.pdf";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      await persistSnapshot();
      toast.success("Document téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setExporting(null);
    }
  };

  // ─── PDF generators ───
  const buildRecapPdf = () => {
    const doc = new jsPDF();
    // Watermark
    doc.setTextColor(220, 220, 220);
    doc.setFontSize(80);
    doc.text("BROUILLON", 105, 150, { align: "center", angle: 45 });
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(18);
    doc.text("Récapitulatif de succession", 14, 20);
    doc.setFontSize(10);
    doc.text(
      `Édité le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`,
      14,
      27
    );

    let y = 38;
    doc.setFontSize(13);
    doc.text("Défunt", 14, y);
    y += 6;
    doc.setFontSize(10);
    const defuntLines = [
      `Nom : ${defunt?.full_name ?? "—"}`,
      `Né(e) le : ${fmtDate(defunt?.birth_date ?? null)}`,
      `Décédé(e) le : ${fmtDate(defunt?.death_date ?? null)} à ${defunt?.death_place ?? "—"}`,
      `Domicile : ${defunt?.domicile ?? "—"}`,
      `Situation : ${defunt?.marital_status ?? "—"}${defunt?.matrimonial_regime ? ` (${defunt.matrimonial_regime})` : ""}`,
    ];
    defuntLines.forEach((l) => {
      doc.text(l, 14, y);
      y += 5;
    });

    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Héritier", "Lien", "Statut"]],
      body: heritiers.map((h) => [h.full_name ?? "", h.lien_parente ?? "", h.status ?? ""]),
      headStyles: { fillColor: [26, 34, 56] },
    });

    autoTable(doc, {
      head: [["Catégorie d'actif", "Libellé", "Valeur"]],
      body: actifsByType.flatMap((g) => [
        ...g.items.map((i) => [g.label, i.libelle ?? "", fmtEuro(Number(i.valeur_estimee || 0))]),
        [{ content: `Sous-total ${g.label}`, colSpan: 2, styles: { fontStyle: "bold" as const } }, { content: fmtEuro(g.total), styles: { fontStyle: "bold" as const } }],
      ]),
      foot: [["", "Total actif brut", fmtEuro(actifBrut)]],
      headStyles: { fillColor: [26, 34, 56] },
      footStyles: { fillColor: [201, 169, 97], textColor: 0 },
    });

    if (passifs.length) {
      autoTable(doc, {
        head: [["Type de dette", "Libellé", "Montant"]],
        body: passifs.map((p) => [p.type_dette ?? "", p.libelle ?? "", fmtEuro(Number(p.montant || 0))]),
        foot: [["", "Total passif", fmtEuro(passifTotal)]],
        headStyles: { fillColor: [26, 34, 56] },
        footStyles: { fillColor: [201, 169, 97], textColor: 0 },
      });
    }

    if (donations.length) {
      autoTable(doc, {
        head: [["Bénéficiaire", "Date", "Type", "Montant", "< 15 ans"]],
        body: donations.map((d) => [
          d.beneficiaire_name ?? "",
          fmtDate(d.date_donation),
          d.type_donation ?? "",
          fmtEuro(Number(d.montant || 0)),
          d.dans_15_ans ? "Oui" : "Non",
        ]),
        foot: [["", "", "", "Donations < 15 ans à rappeler", fmtEuro(rappelDonations)]],
        headStyles: { fillColor: [26, 34, 56] },
        footStyles: { fillColor: [201, 169, 97], textColor: 0 },
      });
    }

    const finalY = (doc as any).lastAutoTable?.finalY ?? y;
    let yy = finalY + 8;
    doc.setFontSize(13);
    doc.text("Estimation fiscale", 14, yy);
    yy += 6;
    doc.setFontSize(10);
    [
      `Actif net : ${fmtEuro(actifNet)}`,
      `Actif imposable : ${fmtEuro(actifImposable)}`,
      `Fourchette estimative des droits : ${fmtEuro(droitsBasse)} – ${fmtEuro(droitsHaute)}`,
      `(basse 4 % / moyenne 5 % / haute 6 %)`,
    ].forEach((l) => {
      doc.text(l, 14, yy);
      yy += 5;
    });

    yy += 4;
    doc.setFontSize(8);
    const disclaimer =
      "Cette estimation est indicative et ne tient pas compte des abattements individuels par héritier, des exonérations spécifiques (conjoint survivant, partenaire PACS…) ni des réductions pour charge de famille. Le calcul officiel est réalisé par la DGFIP.";
    doc.text(doc.splitTextToSize(disclaimer, 180), 14, yy);

    return doc;
  };

  const buildChecklistPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Pièces à réunir", 14, 20);
    doc.setFontSize(10);
    doc.text(`Dossier : ${defunt?.full_name ?? ""}`, 14, 28);
    let y = 40;
    checklist.forEach((c, i) => {
      doc.text(`☐  ${i + 1}. ${c}`, 14, y);
      y += 8;
    });
    return doc;
  };

  const buildCerfaPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("CERFA 2705-SD — Pré-rempli (brouillon)", 14, 18);
    doc.setFontSize(9);
    doc.text(
      "Document de travail. Le formulaire officiel doit être téléchargé sur impots.gouv.fr.",
      14,
      24
    );
    autoTable(doc, {
      startY: 32,
      head: [["Champ", "Valeur"]],
      body: [
        ["Nom du défunt", defunt?.full_name ?? ""],
        ["Date de naissance", fmtDate(defunt?.birth_date ?? null)],
        ["Date de décès", fmtDate(defunt?.death_date ?? null)],
        ["Lieu de décès", defunt?.death_place ?? ""],
        ["Domicile", defunt?.domicile ?? ""],
        ["Situation matrimoniale", defunt?.marital_status ?? ""],
        ["Régime matrimonial", defunt?.matrimonial_regime ?? ""],
        ["Nombre d'héritiers", String(heritiers.length)],
        ["Actif brut", fmtEuro(actifBrut)],
        ["Passif total", fmtEuro(passifTotal)],
        ["Actif net", fmtEuro(actifNet)],
        ["Donations < 15 ans rappelées", fmtEuro(rappelDonations)],
        ["Actif imposable", fmtEuro(actifImposable)],
      ],
      headStyles: { fillColor: [26, 34, 56] },
    });
    return doc;
  };

  const buildCerfaAvPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("CERFA 2705-A-SD — Assurance-vie (brouillon)", 14, 18);
    const avs = actifs.filter(
      (a) =>
        a.type_bien === "assurance_vie" &&
        (a.details?.date_primes === "apres_70" || a.details?.date_primes === "mixte")
    );
    autoTable(doc, {
      startY: 28,
      head: [["Compagnie", "N° contrat", "Capital décès", "Versement primes"]],
      body: avs.map((a) => [
        a.details?.compagnie ?? "",
        a.details?.numero_contrat ?? "",
        fmtEuro(Number(a.valeur_estimee || 0)),
        a.details?.date_primes ?? "",
      ]),
      headStyles: { fillColor: [26, 34, 56] },
    });
    return doc;
  };

  const handleExport = async (kind: "recap" | "cerfa" | "checklist" | "cerfa-av") => {
    setExporting(kind);
    try {
      await persistSnapshot();
      let doc: jsPDF;
      let filename: string;
      switch (kind) {
        case "recap":
          doc = buildRecapPdf();
          filename = "recapitulatif-succession.pdf";
          break;
        case "cerfa":
          doc = buildCerfaPdf();
          filename = "cerfa-2705-SD-prerempli.pdf";
          break;
        case "checklist":
          doc = buildChecklistPdf();
          filename = "checklist-pieces.pdf";
          break;
        case "cerfa-av":
          doc = buildCerfaAvPdf();
          filename = "cerfa-2705-A-SD-prerempli.pdf";
          break;
      }
      doc.save(filename);
      toast.success("Document téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>Étape 6 sur 6</span>
          <span>Synthèse</span>
        </div>
        <Progress value={100} className="h-2" />
      </div>

      <h1 className="mb-2 font-serif text-3xl font-semibold text-primary">
        Synthèse & export
      </h1>
      <p className="mb-8 text-muted-foreground">
        Vérifiez votre dossier puis téléchargez les documents nécessaires au dépôt.
      </p>

      {/* Section 1 — Défunt */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold text-primary">
            1. Récapitulatif défunt
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Nom</dt>
              <dd className="font-medium">{defunt?.full_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Né(e) le</dt>
              <dd className="font-medium">{fmtDate(defunt?.birth_date ?? null)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Décédé(e) le</dt>
              <dd className="font-medium">
                {fmtDate(defunt?.death_date ?? null)}
                {defunt?.death_place ? ` à ${defunt.death_place}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Domicile</dt>
              <dd className="font-medium">{defunt?.domicile ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Situation matrimoniale</dt>
              <dd className="font-medium">
                {defunt?.marital_status ?? "—"}
                {defunt?.matrimonial_regime ? ` — ${defunt.matrimonial_regime}` : ""}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Section 2 — Héritiers */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold text-primary">
            2. Héritiers ({heritiers.length})
          </h2>
          {heritiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun héritier renseigné.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Lien de parenté</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heritiers.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell>{h.full_name ?? "—"}</TableCell>
                    <TableCell>{h.lien_parente ?? "—"}</TableCell>
                    <TableCell>{h.status ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Actif */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold text-primary">
            3. Actif
          </h2>
          {actifsByType.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun actif renseigné.</p>
          ) : (
            <div className="space-y-4">
              {actifsByType.map((g) => (
                <div key={g.key} className="rounded-md border border-border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-medium text-primary">{g.label}</h3>
                    <span className="font-semibold">{fmtEuro(g.total)}</span>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {g.items.map((i) => (
                      <li key={i.id} className="flex justify-between">
                        <span>{i.libelle ?? "—"}</span>
                        <span>{fmtEuro(Number(i.valeur_estimee || 0))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between rounded-md bg-accent/10 px-4 py-3">
            <span className="font-medium text-primary">Total actif brut</span>
            <span className="text-lg font-semibold text-primary">{fmtEuro(actifBrut)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Section 4 — Passif */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold text-primary">
            4. Passif
          </h2>
          {passifs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune dette renseignée.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passifs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.type_dette ?? "—"}</TableCell>
                    <TableCell>{p.libelle ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {fmtEuro(Number(p.montant || 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="mt-4 flex items-center justify-between rounded-md bg-accent/10 px-4 py-3">
            <span className="font-medium text-primary">Total passif</span>
            <span className="text-lg font-semibold text-primary">{fmtEuro(passifTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Section 5 — Donations */}
      {donations.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="mb-4 font-serif text-xl font-semibold text-primary">
              5. Donations antérieures
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>&lt; 15 ans</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.beneficiaire_name ?? "—"}</TableCell>
                    <TableCell>{fmtDate(d.date_donation)}</TableCell>
                    <TableCell>{d.type_donation ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {fmtEuro(Number(d.montant || 0))}
                    </TableCell>
                    <TableCell>{d.dans_15_ans ? "Oui" : "Non"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-between rounded-md bg-accent/10 px-4 py-3">
              <span className="font-medium text-primary">
                Donations &lt; 15 ans à rappeler
              </span>
              <span className="text-lg font-semibold text-primary">
                {fmtEuro(rappelDonations)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 6 — Estimation fiscale */}
      <Card className="mb-6 border-accent">
        <CardContent className="p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold text-primary">
            6. Estimation fiscale
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border p-4">
              <div className="text-sm text-muted-foreground">Actif net</div>
              <div className="text-xl font-semibold text-primary">{fmtEuro(actifNet)}</div>
            </div>
            <div className="rounded-md border border-border p-4">
              <div className="text-sm text-muted-foreground">Actif imposable</div>
              <div className="text-xl font-semibold text-primary">
                {fmtEuro(actifImposable)}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-md bg-primary p-5 text-primary-foreground">
            <div className="text-sm opacity-80">Fourchette estimative des droits</div>
            <div className="mt-1 text-2xl font-semibold">
              entre {fmtEuro(droitsBasse)} et {fmtEuro(droitsHaute)}
            </div>
            <div className="mt-1 text-xs opacity-80">
              basse 4 % · moyenne {fmtEuro(droitsMoyen)} (5 %) · haute 6 %
            </div>
          </div>
          <Alert className="mt-4 border-accent bg-accent/5">
            <Info className="h-5 w-5 text-accent" />
            <AlertDescription className="text-base font-medium text-foreground">
              Cette estimation est <strong>indicative</strong> et ne tient pas compte des
              abattements individuels par héritier, des exonérations spécifiques (conjoint
              survivant, partenaire PACS…) ni des réductions pour charge de famille. Le
              calcul officiel est réalisé par la DGFIP.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Section 7 — Alertes */}
      {alerts.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="mb-4 font-serif text-xl font-semibold text-primary">
              7. Alertes
            </h2>
            <div className="space-y-3">
              {alerts.map((a, i) => (
                <Alert key={i}>
                  <a.icon className="h-4 w-4" />
                  <AlertDescription>{a.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 8 — Checklist */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold text-primary">
            8. Pièces à réunir
          </h2>
          <ul className="space-y-2 text-sm">
            {checklist.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Exports */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h2 className="mb-4 font-serif text-xl font-semibold text-primary">
            Téléchargements
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              onClick={() => handleExport("recap")}
              disabled={!!exporting}
              className="justify-start"
            >
              {exporting === "recap" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Récapitulatif PDF (brouillon)
            </Button>
            <Button
              onClick={() => handleExport("cerfa")}
              disabled={!!exporting}
              variant="secondary"
              className="justify-start"
            >
              {exporting === "cerfa" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              CERFA 2705-SD pré-rempli
            </Button>
            <Button
              onClick={() => handleExport("checklist")}
              disabled={!!exporting}
              variant="outline"
              className="justify-start"
            >
              {exporting === "checklist" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckSquare className="h-4 w-4" />
              )}
              Checklist des pièces (PDF)
            </Button>
            {hasAVApres70 && (
              <Button
                onClick={() => handleExport("cerfa-av")}
                disabled={!!exporting}
                variant="secondary"
                className="justify-start"
              >
                {exporting === "cerfa-av" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                CERFA 2705-A-SD (assurance-vie)
              </Button>
            )}
          </div>

          {exported && (
            <Alert className="mt-6 border-accent bg-accent/5">
              <Info className="h-4 w-4 text-accent" />
              <AlertDescription className="font-medium">
                Vous avez 90 jours pour revenir sur votre dossier. Au-delà, il sera
                automatiquement supprimé (RGPD).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate("/etape/5")}>
          Précédent
        </Button>
        <Button variant="ghost" onClick={() => navigate("/")}>
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
};

export default Synthese;
