import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, FileText, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Defunt = {
  id: string;
  full_name: string | null;
  birth_date: string | null;
  death_date: string | null;
  death_place: string | null;
  domicile: string | null;
  pre_rempli_fields: string[];
};

type Heritier = {
  id: string;
  full_name: string | null;
  lien_parente: string | null;
  birth_date: string | null;
  pre_rempli_fields: string[];
};

type ItemRow = {
  id: string;
  libelle?: string | null;
  valeur_estimee?: number | null;
  montant?: number | null;
  type_bien?: string | null;
  type_dette?: string | null;
  type_donation?: string | null;
  beneficiaire_name?: string | null;
  date_donation?: string | null;
  pre_rempli: boolean | null;
  details?: any;
};

const DEFUNT_FIELDS: { key: keyof Defunt; label: string; type?: string }[] = [
  { key: "full_name", label: "Nom complet" },
  { key: "birth_date", label: "Date de naissance", type: "date" },
  { key: "death_date", label: "Date de décès", type: "date" },
  { key: "death_place", label: "Lieu de décès" },
  { key: "domicile", label: "Domicile" },
];

const HERITIER_FIELDS: { key: keyof Heritier; label: string; type?: string }[] = [
  { key: "full_name", label: "Nom complet" },
  { key: "lien_parente", label: "Lien de parenté" },
  { key: "birth_date", label: "Date de naissance", type: "date" },
];

const IaBadge = () => (
  <Badge className="gap-1 bg-accent/15 text-accent-foreground border border-accent/40 font-normal">
    <Sparkles className="w-3 h-3" />
    IA
  </Badge>
);

const FieldShell = ({
  label,
  isAi,
  onValidate,
  onViewSource,
  children,
}: {
  label: string;
  isAi: boolean;
  onValidate?: () => void;
  onViewSource?: () => void;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <Label className="flex items-center gap-2">
        {label}
        {isAi && <IaBadge />}
      </Label>
      {isAi && (
        <div className="flex items-center gap-2">
          {onViewSource && (
            <button
              type="button"
              onClick={onViewSource}
              className="text-xs text-accent hover:underline"
            >
              Voir le document source
            </button>
          )}
          {onValidate && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onValidate}
            >
              <CheckCircle2 className="w-3 h-3" />
              Valider
            </Button>
          )}
        </div>
      )}
    </div>
    <div
      className={cn(
        "rounded-md transition-all",
        isAi && "border-l-4 border-accent pl-2 bg-accent/5",
      )}
    >
      {children}
    </div>
  </div>
);

const TabSummary = ({ ai, missing }: { ai: number; missing: number }) => (
  <Card className="mb-4 border-accent/30 bg-accent/5">
    <CardContent className="p-3 text-sm flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-accent" />
      <span>
        <strong>{ai}</strong> champ{ai > 1 ? "s" : ""} pré-rempli{ai > 1 ? "s" : ""}
        , <strong>{missing}</strong> à compléter.
      </span>
    </CardContent>
  </Card>
);

const ModeIaRevision = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [declarationId, setDeclarationId] = useState<string | null>(null);

  const [defunt, setDefunt] = useState<Defunt | null>(null);
  const [heritiers, setHeritiers] = useState<Heritier[]>([]);
  const [actifs, setActifs] = useState<ItemRow[]>([]);
  const [passifs, setPassifs] = useState<ItemRow[]>([]);
  const [donations, setDonations] = useState<ItemRow[]>([]);

  const [sourceDocUrl, setSourceDocUrl] = useState<string | null>(null);
  const [sourceDocLoading, setSourceDocLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("deesse_token");
      if (!token) {
        navigate("/choix-mode");
        return;
      }
      const { data: decl } = await supabase
        .from("declarations")
        .select("id")
        .eq("anonymous_token", token)
        .maybeSingle();
      if (!decl) {
        navigate("/choix-mode");
        return;
      }
      setDeclarationId(decl.id);

      const [d, h, a, pa, do_] = await Promise.all([
        supabase.from("defunts").select("*").eq("declaration_id", decl.id).maybeSingle(),
        supabase.from("heritiers").select("*").eq("declaration_id", decl.id).order("ordre", { ascending: true }),
        supabase.from("actif_items").select("*").eq("declaration_id", decl.id),
        supabase.from("passif_items").select("*").eq("declaration_id", decl.id),
        supabase.from("donations").select("*").eq("declaration_id", decl.id),
      ]);

      setDefunt(
        d.data
          ? { ...(d.data as any), pre_rempli_fields: (d.data as any).pre_rempli_fields ?? [] }
          : null,
      );
      setHeritiers(
        (h.data ?? []).map((x: any) => ({
          ...x,
          pre_rempli_fields: x.pre_rempli_fields ?? [],
        })),
      );
      setActifs((a.data ?? []) as ItemRow[]);
      setPassifs((pa.data ?? []) as ItemRow[]);
      setDonations((do_.data ?? []) as unknown as ItemRow[]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  // ---------- Open source document ----------
  const openSourceDoc = async (sourceDocId?: string) => {
    if (!sourceDocId) {
      toast({ title: "Aucun document source", description: "Ce champ n'est rattaché à aucun document." });
      return;
    }
    setSourceDocLoading(true);
    setSourceDocUrl("loading");
    const { data: doc } = await supabase
      .from("uploaded_documents")
      .select("storage_path")
      .eq("id", sourceDocId)
      .maybeSingle();
    if (!doc?.storage_path) {
      setSourceDocUrl(null);
      setSourceDocLoading(false);
      toast({ title: "Document introuvable", variant: "destructive" });
      return;
    }
    const { data: signed } = await supabase.storage
      .from("uploads")
      .createSignedUrl(doc.storage_path, 60 * 10);
    setSourceDocUrl(signed?.signedUrl ?? null);
    setSourceDocLoading(false);
  };

  // ---------- DEFUNT ----------
  const updateDefuntField = (key: keyof Defunt, value: string) => {
    setDefunt((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const persistDefunt = async (extra?: Partial<Defunt>) => {
    if (!defunt || !declarationId) return;
    const payload = { ...defunt, ...extra };
    await supabase
      .from("defunts")
      .update({
        full_name: payload.full_name,
        birth_date: payload.birth_date || null,
        death_date: payload.death_date || null,
        death_place: payload.death_place,
        domicile: payload.domicile,
        pre_rempli_fields: payload.pre_rempli_fields,
      })
      .eq("id", payload.id);
  };

  const validateDefuntField = async (key: string) => {
    if (!defunt) return;
    const next = defunt.pre_rempli_fields.filter((f) => f !== key);
    setDefunt({ ...defunt, pre_rempli_fields: next });
    await persistDefunt({ pre_rempli_fields: next });
    toast({ title: "Champ validé", description: "Marqué comme accepté." });
  };

  // ---------- HERITIERS ----------
  const updateHeritierField = (id: string, key: keyof Heritier, value: string) => {
    setHeritiers((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [key]: value } : h)),
    );
  };

  const persistHeritier = async (h: Heritier) => {
    await supabase
      .from("heritiers")
      .update({
        full_name: h.full_name,
        lien_parente: h.lien_parente,
        birth_date: h.birth_date || null,
        pre_rempli_fields: h.pre_rempli_fields,
      })
      .eq("id", h.id);
  };

  const validateHeritierField = async (id: string, key: string) => {
    const h = heritiers.find((x) => x.id === id);
    if (!h) return;
    const next = h.pre_rempli_fields.filter((f) => f !== key);
    const updated = { ...h, pre_rempli_fields: next };
    setHeritiers((prev) => prev.map((x) => (x.id === id ? updated : x)));
    await persistHeritier(updated);
  };

  // ---------- ACTIFS / PASSIFS / DONATIONS (row-level) ----------
  const validateRow = async (
    table: "actif_items" | "passif_items" | "donations",
    id: string,
  ) => {
    await supabase.from(table).update({ pre_rempli: false }).eq("id", id);
    const setter =
      table === "actif_items" ? setActifs : table === "passif_items" ? setPassifs : setDonations;
    setter((prev: ItemRow[]) =>
      prev.map((r) => (r.id === id ? { ...r, pre_rempli: false } : r)),
    );
    toast({ title: "Ligne validée" });
  };

  const updateItemField = (
    table: "actif_items" | "passif_items" | "donations",
    id: string,
    field: string,
    value: any,
  ) => {
    const setter =
      table === "actif_items" ? setActifs : table === "passif_items" ? setPassifs : setDonations;
    setter((prev: ItemRow[]) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const persistItem = async (
    table: "actif_items" | "passif_items" | "donations",
    row: ItemRow,
  ) => {
    const update: any = { libelle: row.libelle };
    if (table === "actif_items") update.valeur_estimee = row.valeur_estimee;
    if (table === "passif_items") update.montant = row.montant;
    if (table === "donations") {
      update.montant = row.montant;
      update.beneficiaire_name = row.beneficiaire_name;
      update.date_donation = row.date_donation || null;
    }
    await supabase.from(table).update(update).eq("id", row.id);
  };

  // ---------- Tab summaries ----------
  const defuntSummary = useMemo(() => {
    if (!defunt) return { ai: 0, missing: DEFUNT_FIELDS.length };
    const ai = defunt.pre_rempli_fields.length;
    const missing = DEFUNT_FIELDS.filter((f) => !defunt[f.key]).length;
    return { ai, missing };
  }, [defunt]);

  const heritiersSummary = useMemo(() => {
    let ai = 0;
    let missing = 0;
    heritiers.forEach((h) => {
      ai += h.pre_rempli_fields.length;
      HERITIER_FIELDS.forEach((f) => {
        if (!h[f.key]) missing++;
      });
    });
    return { ai, missing };
  }, [heritiers]);

  const itemSummary = (rows: ItemRow[]) => ({
    ai: rows.filter((r) => r.pre_rempli).length,
    missing: rows.filter((r) => !r.libelle).length,
  });

  const handleContinue = async () => {
    navigate("/etape/6");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" />
        <p className="mt-3 text-muted-foreground text-sm">Chargement de votre révision…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-accent" />
        <span className="text-sm uppercase tracking-wider text-muted-foreground">
          Mode IA — Révision
        </span>
      </div>
      <h1 className="font-heading text-3xl md:text-4xl font-bold mb-3">
        Vérifiez et validez les données extraites
      </h1>
      <p className="text-muted-foreground mb-6">
        Vous gardez la main sur chaque champ. Validez, modifiez ou complétez.
      </p>

      <Tabs defaultValue="defunt" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full mb-6 h-auto">
          <TabsTrigger value="defunt">Défunt</TabsTrigger>
          <TabsTrigger value="heritiers">Héritiers</TabsTrigger>
          <TabsTrigger value="actif">Actif</TabsTrigger>
          <TabsTrigger value="passif">Passif</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
        </TabsList>

        {/* DEFUNT */}
        <TabsContent value="defunt">
          <TabSummary ai={defuntSummary.ai} missing={defuntSummary.missing} />
          <Card>
            <CardContent className="p-6 space-y-5">
              {DEFUNT_FIELDS.map((f) => {
                const isAi = defunt?.pre_rempli_fields.includes(f.key as string) ?? false;
                const value = (defunt?.[f.key] as string) ?? "";
                return (
                  <FieldShell
                    key={f.key as string}
                    label={f.label}
                    isAi={isAi}
                    onValidate={isAi ? () => validateDefuntField(f.key as string) : undefined}
                    onViewSource={isAi ? () => openSourceDoc(undefined) : undefined}
                  >
                    <Input
                      type={f.type ?? "text"}
                      value={value}
                      placeholder={value ? undefined : "À compléter"}
                      onChange={(e) => updateDefuntField(f.key, e.target.value)}
                      onBlur={() => persistDefunt()}
                    />
                  </FieldShell>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HERITIERS */}
        <TabsContent value="heritiers">
          <TabSummary ai={heritiersSummary.ai} missing={heritiersSummary.missing} />
          {heritiers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Aucun héritier détecté. Vous pourrez les ajouter à l'étape suivante.
              </CardContent>
            </Card>
          ) : (
            heritiers.map((h, idx) => (
              <Card key={h.id} className="mb-4">
                <CardContent className="p-6 space-y-5">
                  <h3 className="font-heading font-semibold">Héritier #{idx + 1}</h3>
                  {HERITIER_FIELDS.map((f) => {
                    const isAi = h.pre_rempli_fields.includes(f.key as string);
                    const value = (h[f.key] as string) ?? "";
                    return (
                      <FieldShell
                        key={f.key as string}
                        label={f.label}
                        isAi={isAi}
                        onValidate={isAi ? () => validateHeritierField(h.id, f.key as string) : undefined}
                        onViewSource={isAi ? () => openSourceDoc(undefined) : undefined}
                      >
                        <Input
                          type={f.type ?? "text"}
                          value={value}
                          placeholder={value ? undefined : "À compléter"}
                          onChange={(e) => updateHeritierField(h.id, f.key, e.target.value)}
                          onBlur={() => persistHeritier(heritiers.find((x) => x.id === h.id)!)}
                        />
                      </FieldShell>
                    );
                  })}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ACTIF */}
        <TabsContent value="actif">
          <TabSummary {...itemSummary(actifs)} />
          {actifs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Aucun actif détecté.
              </CardContent>
            </Card>
          ) : (
            actifs.map((row) => (
              <Card key={row.id} className="mb-3">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {row.type_bien ?? "Actif"}
                      </span>
                      {row.pre_rempli && <IaBadge />}
                    </div>
                    {row.pre_rempli && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openSourceDoc(row.details?.source_doc_id)}
                          className="text-xs text-accent hover:underline"
                        >
                          Voir le document source
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => validateRow("actif_items", row.id)}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Valider
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className={cn(row.pre_rempli && "border-l-4 border-accent pl-3 bg-accent/5 rounded-md py-2")}>
                    <Label className="text-xs">Libellé</Label>
                    <Input
                      value={row.libelle ?? ""}
                      placeholder="À compléter"
                      onChange={(e) => updateItemField("actif_items", row.id, "libelle", e.target.value)}
                      onBlur={() => persistItem("actif_items", actifs.find((x) => x.id === row.id)!)}
                    />
                    <Label className="text-xs mt-3 block">Valeur estimée (€)</Label>
                    <Input
                      type="number"
                      value={row.valeur_estimee ?? ""}
                      placeholder="À compléter"
                      onChange={(e) => updateItemField("actif_items", row.id, "valeur_estimee", e.target.value ? Number(e.target.value) : null)}
                      onBlur={() => persistItem("actif_items", actifs.find((x) => x.id === row.id)!)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* PASSIF */}
        <TabsContent value="passif">
          <TabSummary {...itemSummary(passifs)} />
          {passifs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Aucun passif détecté.
              </CardContent>
            </Card>
          ) : (
            passifs.map((row) => (
              <Card key={row.id} className="mb-3">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {row.type_dette ?? "Dette"}
                      </span>
                      {row.pre_rempli && <IaBadge />}
                    </div>
                    {row.pre_rempli && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openSourceDoc(row.details?.source_doc_id)}
                          className="text-xs text-accent hover:underline"
                        >
                          Voir le document source
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => validateRow("passif_items", row.id)}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Valider
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className={cn(row.pre_rempli && "border-l-4 border-accent pl-3 bg-accent/5 rounded-md py-2")}>
                    <Label className="text-xs">Créancier / libellé</Label>
                    <Input
                      value={row.libelle ?? ""}
                      placeholder="À compléter"
                      onChange={(e) => updateItemField("passif_items", row.id, "libelle", e.target.value)}
                      onBlur={() => persistItem("passif_items", passifs.find((x) => x.id === row.id)!)}
                    />
                    <Label className="text-xs mt-3 block">Montant (€)</Label>
                    <Input
                      type="number"
                      value={row.montant ?? ""}
                      placeholder="À compléter"
                      onChange={(e) => updateItemField("passif_items", row.id, "montant", e.target.value ? Number(e.target.value) : null)}
                      onBlur={() => persistItem("passif_items", passifs.find((x) => x.id === row.id)!)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* DONATIONS */}
        <TabsContent value="donations">
          <TabSummary {...itemSummary(donations)} />
          {donations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Aucune donation détectée.
              </CardContent>
            </Card>
          ) : (
            donations.map((row) => (
              <Card key={row.id} className="mb-3">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {row.type_donation ?? "Donation"}
                      </span>
                      {row.pre_rempli && <IaBadge />}
                    </div>
                    {row.pre_rempli && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openSourceDoc((row as any).details?.source_doc_id)}
                          className="text-xs text-accent hover:underline"
                        >
                          Voir le document source
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => validateRow("donations", row.id)}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Valider
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className={cn(row.pre_rempli && "border-l-4 border-accent pl-3 bg-accent/5 rounded-md py-2 space-y-3")}>
                    <div>
                      <Label className="text-xs">Bénéficiaire</Label>
                      <Input
                        value={row.beneficiaire_name ?? ""}
                        placeholder="À compléter"
                        onChange={(e) => updateItemField("donations", row.id, "beneficiaire_name", e.target.value)}
                        onBlur={() => persistItem("donations", donations.find((x) => x.id === row.id)!)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        value={row.date_donation ?? ""}
                        onChange={(e) => updateItemField("donations", row.id, "date_donation", e.target.value)}
                        onBlur={() => persistItem("donations", donations.find((x) => x.id === row.id)!)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Montant (€)</Label>
                      <Input
                        type="number"
                        value={row.montant ?? ""}
                        placeholder="À compléter"
                        onChange={(e) => updateItemField("donations", row.id, "montant", e.target.value ? Number(e.target.value) : null)}
                        onBlur={() => persistItem("donations", donations.find((x) => x.id === row.id)!)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex justify-end">
        <Button size="lg" onClick={handleContinue}>
          Valider et continuer vers la synthèse
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Source document modal */}
      <Dialog open={sourceDocUrl !== null} onOpenChange={(o) => !o && setSourceDocUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" />
              Document source
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] w-full">
            {sourceDocLoading || sourceDocUrl === "loading" ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : sourceDocUrl ? (
              <iframe src={sourceDocUrl} className="w-full h-full rounded-md border" title="Document source" />
            ) : (
              <p className="text-sm text-muted-foreground">Document indisponible.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModeIaRevision;
