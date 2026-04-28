import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, AlertTriangle, PenLine } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { DateInput } from "@/components/ui/date-input";
import ModeIaSourcePreview from "@/components/ModeIaSourcePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SaveIndicator } from "@/components/SaveIndicator";
import { useSaveStatus } from "@/hooks/useSaveStatus";

const LIENS_PARENTE = [
  "Enfant",
  "Conjoint survivant",
  "Parent",
  "Frère/Sœur",
  "Neveu/Nièce",
  "Autre",
];

const STATUTS = [
  { value: "accepte", label: "J'accepte la succession" },
  { value: "renonce", label: "Je renonce" },
  { value: "non_precise", label: "Je n'ai pas encore décidé" },
];

const SITUATIONS_MATRIMONIALES = [
  { value: "celibataire", label: "Célibataire" },
  { value: "marie", label: "Marié(e)" },
  { value: "pacse", label: "Pacsé(e)" },
  { value: "divorce", label: "Divorcé(e)" },
  { value: "veuf", label: "Veuf(ve)" },
];

const REGIMES_MATRIMONIAUX = [
  "Communauté d'acquêts à défaut de contrat préalable",
  "Communauté universelle",
  "Séparation de biens",
  "Participation aux acquêts",
  "Autre",
];

const heritierSchema = z.object({
  civilite: z.enum(["M.", "Mme"], { required_error: "La civilité est requise" }),
  nom_naissance: z.string().trim().min(1, "Le nom de naissance est requis").max(100),
  nom_usage: z.string().trim().max(100).optional().or(z.literal("")),
  prenoms: z.string().trim().min(1, "Les prénoms sont requis").max(200),
  birth_date: z.date({ required_error: "La date de naissance est requise" }),
  lieu_naissance: z.string().trim().max(200).optional().or(z.literal("")),
  lien_parente: z.string().min(1, "Le lien de parenté est requis"),
  ordre: z.coerce.number().int().positive().optional().or(z.literal("")),
  status: z.string().min(1, "Le statut est requis"),
  email_notification: z.string().email("Email invalide").optional().or(z.literal("")),
  telephone: z.string().trim().max(40).optional().or(z.literal("")),
  profession: z.string().trim().max(200).optional().or(z.literal("")),
  adresse_rue: z.string().trim().max(300).optional().or(z.literal("")),
  adresse_code_postal: z.string().trim().max(10).optional().or(z.literal("")),
  adresse_ville: z.string().trim().max(100).optional().or(z.literal("")),
  adresse_pays: z.string().trim().max(100).optional().or(z.literal("")),
  est_declarant: z.boolean().default(false),

  // Situation matrimoniale
  situation_matrimoniale: z.string().min(1, "La situation matrimoniale est requise"),
  conjoint_civilite: z.string().optional().or(z.literal("")),
  conjoint_nom_naissance: z.string().trim().max(100).optional().or(z.literal("")),
  conjoint_prenoms: z.string().trim().max(200).optional().or(z.literal("")),
  date_mariage: z.date().optional(),
  lieu_mariage: z.string().trim().max(200).optional().or(z.literal("")),
  regime_matrimonial: z.string().optional().or(z.literal("")),
  regime_modifie: z.boolean().default(false),

  // Identité administrative
  nationalite: z.string().trim().min(1, "La nationalité est requise").max(100),
  resident_fiscal_france: z.boolean().default(true),
});

type HeritierFormValues = z.infer<typeof heritierSchema>;

interface Heritier {
  id: string;
  full_name: string | null;
  civilite: string | null;
  nom_naissance: string | null;
  nom_usage: string | null;
  prenoms: string | null;
  birth_date: string | null;
  lieu_naissance: string | null;
  lien_parente: string | null;
  ordre: number | null;
  status: string | null;
  email_notification: string | null;
  telephone: string | null;
  profession: string | null;
  adresse_rue: string | null;
  adresse_code_postal: string | null;
  adresse_ville: string | null;
  adresse_pays: string | null;
  est_declarant: boolean | null;
  declaration_id: string | null;
  situation_matrimoniale: string | null;
  conjoint_civilite: string | null;
  conjoint_nom_naissance: string | null;
  conjoint_prenoms: string | null;
  date_mariage: string | null;
  lieu_mariage: string | null;
  regime_matrimonial: string | null;
  regime_modifie: boolean | null;
  nationalite: string | null;
  resident_fiscal_france: boolean | null;
}

const defaultFormValues: HeritierFormValues = {
  civilite: undefined as any,
  nom_naissance: "",
  nom_usage: "",
  prenoms: "",
  birth_date: undefined as any,
  lieu_naissance: "",
  lien_parente: "",
  ordre: "",
  status: "non_precise",
  email_notification: "",
  telephone: "",
  profession: "",
  adresse_rue: "",
  adresse_code_postal: "",
  adresse_ville: "",
  adresse_pays: "France",
  est_declarant: false,
  situation_matrimoniale: "",
  conjoint_civilite: "",
  conjoint_nom_naissance: "",
  conjoint_prenoms: "",
  date_mariage: undefined,
  lieu_mariage: "",
  regime_matrimonial: "",
  regime_modifie: false,
  nationalite: "française",
  resident_fiscal_france: true,
};

const showConjointFields = (s?: string | null) =>
  s === "marie" || s === "pacse" || s === "veuf";

const Etape2Heritiers = () => {
  const navigate = useNavigate();
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [heritiers, setHeritiers] = useState<Heritier[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { status: saveStatus, track } = useSaveStatus();

  const form = useForm<HeritierFormValues>({
    resolver: zodResolver(heritierSchema),
    defaultValues: defaultFormValues,
  });

  const loadHeritiers = useCallback(async (declId: string) => {
    const { data } = await supabase
      .from("heritiers")
      .select("*")
      .eq("declaration_id", declId)
      .order("ordre", { ascending: true, nullsFirst: false });
    if (data) setHeritiers(data as any);
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("deesse_token");
      if (!token) return;
      const { data: decl } = await supabase
        .from("declarations")
        .select("id")
        .eq("anonymous_token", token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (decl) {
        setDeclarationId(decl.id);
        loadHeritiers(decl.id);
      }
    };
    init();
  }, [loadHeritiers]);

  const openAddDialog = () => {
    setEditingId(null);
    form.reset(defaultFormValues);
    setDialogOpen(true);
  };

  const openEditDialog = (h: Heritier) => {
    setEditingId(h.id);
    // Backward-compat: if separate fields are empty, try to split full_name
    let nom = h.nom_naissance ?? "";
    let prenoms = h.prenoms ?? "";
    if (!nom && !prenoms && h.full_name) {
      const parts = h.full_name.split(" ");
      nom = parts[0] ?? "";
      prenoms = parts.slice(1).join(" ");
    }
    form.reset({
      civilite: (h.civilite as "M." | "Mme") ?? (undefined as any),
      nom_naissance: nom,
      nom_usage: h.nom_usage ?? "",
      prenoms,
      birth_date: h.birth_date ? new Date(h.birth_date) : (undefined as any),
      lieu_naissance: h.lieu_naissance ?? "",
      lien_parente: h.lien_parente ?? "",
      ordre: h.ordre ?? ("" as any),
      status: h.status ?? "non_precise",
      email_notification: h.email_notification ?? "",
      telephone: h.telephone ?? "",
      profession: h.profession ?? "",
      adresse_rue: h.adresse_rue ?? "",
      adresse_code_postal: h.adresse_code_postal ?? "",
      adresse_ville: h.adresse_ville ?? "",
      adresse_pays: h.adresse_pays ?? "France",
      est_declarant: !!h.est_declarant,
      situation_matrimoniale: h.situation_matrimoniale ?? "",
      conjoint_civilite: h.conjoint_civilite ?? "",
      conjoint_nom_naissance: h.conjoint_nom_naissance ?? "",
      conjoint_prenoms: h.conjoint_prenoms ?? "",
      date_mariage: h.date_mariage ? new Date(h.date_mariage) : undefined,
      lieu_mariage: h.lieu_mariage ?? "",
      regime_matrimonial: h.regime_matrimonial ?? "",
      regime_modifie: !!h.regime_modifie,
      nationalite: h.nationalite ?? "française",
      resident_fiscal_france: h.resident_fiscal_france ?? true,
    });
    setDialogOpen(true);
  };

  const onSubmitHeritier = async (values: HeritierFormValues) => {
    if (!declarationId) return;
    setSaving(true);

    const fullName = `${values.nom_naissance} ${values.prenoms}`.trim();

    const payload: Record<string, any> = {
      declaration_id: declarationId,
      civilite: values.civilite || null,
      nom_naissance: values.nom_naissance || null,
      nom_usage: values.nom_usage || null,
      prenoms: values.prenoms || null,
      full_name: fullName || null,
      birth_date: values.birth_date ? format(values.birth_date, "yyyy-MM-dd") : null,
      lieu_naissance: values.lieu_naissance || null,
      lien_parente: values.lien_parente,
      ordre: values.ordre ? Number(values.ordre) : null,
      status: values.status,
      email_notification: values.email_notification || null,
      telephone: values.telephone || null,
      profession: values.profession || null,
      adresse_rue: values.adresse_rue || null,
      adresse_code_postal: values.adresse_code_postal || null,
      adresse_ville: values.adresse_ville || null,
      adresse_pays: values.adresse_pays || null,
      est_declarant: !!values.est_declarant,
      situation_matrimoniale: values.situation_matrimoniale || null,
      conjoint_civilite: showConjointFields(values.situation_matrimoniale) ? (values.conjoint_civilite || null) : null,
      conjoint_nom_naissance: showConjointFields(values.situation_matrimoniale) ? (values.conjoint_nom_naissance || null) : null,
      conjoint_prenoms: showConjointFields(values.situation_matrimoniale) ? (values.conjoint_prenoms || null) : null,
      date_mariage: values.situation_matrimoniale === "marie" && values.date_mariage ? format(values.date_mariage, "yyyy-MM-dd") : null,
      lieu_mariage: values.situation_matrimoniale === "marie" ? (values.lieu_mariage || null) : null,
      regime_matrimonial: showConjointFields(values.situation_matrimoniale) ? (values.regime_matrimonial || null) : null,
      regime_modifie: showConjointFields(values.situation_matrimoniale) ? !!values.regime_modifie : false,
      nationalite: values.nationalite || null,
      resident_fiscal_france: !!values.resident_fiscal_france,
    };

    await track(async () => {
      let savedId = editingId;
      if (editingId) {
        await (supabase.from("heritiers") as any).update(payload).eq("id", editingId);
      } else {
        const { data: inserted } = await (supabase.from("heritiers") as any)
          .insert(payload)
          .select("id")
          .maybeSingle();
        savedId = inserted?.id ?? null;
      }

      // Enforce single declarant: uncheck others if this one is checked
      if (values.est_declarant && savedId) {
        await supabase
          .from("heritiers")
          .update({ est_declarant: false })
          .eq("declaration_id", declarationId)
          .neq("id", savedId);
      }
    });

    await loadHeritiers(declarationId);
    setSaving(false);
    setDialogOpen(false);
  };

  const deleteHeritier = async (id: string) => {
    if (!declarationId) return;
    await track(() => supabase.from("heritiers").delete().eq("id", id) as any);
    await loadHeritiers(declarationId);
  };

  const handleContinue = async () => {
    if (!declarationId) return;
    const hasDeclarant = heritiers.some((h) => h.est_declarant);
    if (!hasDeclarant && heritiers.length > 0) {
      toast.warning(
        "Vous n'avez pas désigné l'héritier signataire. Le premier héritier de la liste sera utilisé par défaut."
      );
    }
    await supabase
      .from("declarations")
      .update({ current_step: 2 })
      .eq("id", declarationId);
    navigate("/etape/3");
  };

  // Business rules
  const hasHeritiers = heritiers.length > 0;
  const allRenounce =
    hasHeritiers && heritiers.every((h) => h.status === "renonce");
  const canContinue = hasHeritiers && !allRenounce;

  const formatAdresse = (h: Heritier) => {
    const parts = [h.adresse_rue, h.adresse_code_postal, h.adresse_ville].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <ModeIaSourcePreview />
      <SaveIndicator status={saveStatus} />
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            Étape 2 sur 6 — Les héritiers
          </span>
          <span className="text-sm text-muted-foreground">3 / 7</span>
        </div>
        <Progress value={(3 / 7) * 100} className="h-2" />
      </div>

      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
        Identification des héritiers
      </h1>
      <p className="text-muted-foreground mb-8">
        Listez toutes les personnes susceptibles d'hériter. Aucun calcul de
        parts ne sera effectué ici.
      </p>

      {allRenounce && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Au moins un héritier doit accepter la succession pour poursuivre. Si
            toute la famille renonce, la succession est dite vacante — consultez
            un professionnel.
          </AlertDescription>
        </Alert>
      )}

      {/* Heritiers list */}
      {heritiers.length > 0 ? (
        <div className="space-y-3 mb-6">
          {heritiers.map((h) => (
            <Card key={h.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium truncate">
                      {h.full_name || "(Sans nom)"}
                    </p>
                    {h.est_declarant && (
                      <Badge className="bg-accent text-accent-foreground hover:bg-accent/90">
                        <PenLine className="h-3 w-3 mr-1" />
                        Déclarant(e)
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {h.lien_parente}
                    {h.birth_date &&
                      ` · né(e) le ${format(new Date(h.birth_date), "dd/MM/yyyy")}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Adresse : {formatAdresse(h)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {STATUTS.find((s) => s.value === h.status)?.label ?? h.status}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(h)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteHeritier(h.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucun héritier ajouté pour le moment.
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={openAddDialog} className="mb-8">
        <Plus className="h-4 w-4 mr-2" />
        Ajouter un héritier
      </Button>

      {!hasHeritiers && (
        <p className="text-sm text-muted-foreground mb-4">
          Ajoutez au moins un héritier avant de continuer.
        </p>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => navigate("/etape/1")}>
          Précédent
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Sauvegarder et continuer
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingId ? "Modifier l'héritier" : "Ajouter un héritier"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitHeritier)}
              className="space-y-4 mt-2"
            >
              {/* Civilité */}
              <FormField
                control={form.control}
                name="civilite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Civilité *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-6 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="M." id="h-civ-m" />
                          <Label htmlFor="h-civ-m" className="cursor-pointer">M.</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Mme" id="h-civ-mme" />
                          <Label htmlFor="h-civ-mme" className="cursor-pointer">Mme</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nom_naissance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de naissance *</FormLabel>
                      <FormControl>
                        <Input placeholder="Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nom_usage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom d'usage</FormLabel>
                      <FormControl>
                        <Input placeholder="Optionnel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="prenoms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénoms *</FormLabel>
                    <FormControl>
                      <Input placeholder="Marie Claire" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de naissance *</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          max={new Date().toISOString().split("T")[0]}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lieu_naissance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu de naissance</FormLabel>
                      <FormControl>
                        <Input placeholder="Paris (75)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="lien_parente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lien de parenté avec le défunt *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LIENS_PARENTE.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Adresse */}
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium">Adresse</p>
                <FormField
                  control={form.control}
                  name="adresse_rue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rue / numéro</FormLabel>
                      <FormControl>
                        <Input placeholder="12 rue de la Paix" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="adresse_code_postal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code postal</FormLabel>
                        <FormControl>
                          <Input placeholder="75002" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adresse_ville"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input placeholder="Paris" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adresse_pays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <FormControl>
                          <Input placeholder="France" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profession</FormLabel>
                      <FormControl>
                        <Input placeholder="Optionnel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input placeholder="06 12 34 56 78" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ordre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordre successoral (facultatif)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Calculé automatiquement"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-2 mt-2"
                      >
                        {STATUTS.map((s) => (
                          <div key={s.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={s.value} id={`status-${s.value}`} />
                            <Label
                              htmlFor={`status-${s.value}`}
                              className="cursor-pointer text-sm"
                            >
                              {s.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email_notification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="exemple@email.com"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Si vous renseignez un email, la personne pourra recevoir
                      une notification du dépôt final.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="est_declarant"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start space-x-2 rounded-md border p-3 bg-muted/30">
                      <Checkbox
                        id="est-declarant"
                        checked={!!field.value}
                        onCheckedChange={(c) => field.onChange(!!c)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="est-declarant" className="cursor-pointer text-sm font-medium">
                          Cet héritier signera la déclaration de succession
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Un seul héritier peut être désigné signataire — cocher
                          ici décochera automatiquement les autres.
                        </p>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {saving ? "Enregistrement…" : editingId ? "Modifier" : "Ajouter"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Etape2Heritiers;
