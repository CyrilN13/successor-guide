import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  PenLine,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { DateInput } from "@/components/ui/date-input";
import ModeIaSourcePreview from "@/components/ModeIaSourcePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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

const heritierSchema = z.object({
  civilite: z.enum(["M.", "Mme"], { required_error: "La civilité est requise" }),
  nom_naissance: z.string().trim().min(1, "Le nom de naissance est requis").max(100),
  nom_usage: z.string().trim().max(100).optional().or(z.literal("")),
  prenoms: z.string().trim().min(1, "Les prénoms sont requis").max(200),
  birth_date: z.date({ required_error: "La date de naissance est requise" }),
  lieu_naissance: z.string().trim().max(120).optional().or(z.literal("")),
  adresse_rue: z.string().trim().max(200).optional().or(z.literal("")),
  adresse_code_postal: z.string().trim().max(20).optional().or(z.literal("")),
  adresse_ville: z.string().trim().max(100).optional().or(z.literal("")),
  adresse_pays: z.string().trim().max(100).optional().or(z.literal("")),
  profession: z.string().trim().max(100).optional().or(z.literal("")),
  telephone: z.string().trim().max(40).optional().or(z.literal("")),
  lien_parente: z.string().min(1, "Le lien de parenté est requis"),
  ordre: z.coerce.number().int().positive().optional().or(z.literal("")),
  status: z.string().min(1, "Le statut est requis"),
  email_notification: z.string().email("Email invalide").optional().or(z.literal("")),
  est_declarant: z.boolean().optional(),
});

type HeritierFormValues = z.infer<typeof heritierSchema>;

interface Heritier {
  id: string;
  civilite: string | null;
  nom_naissance: string | null;
  nom_usage: string | null;
  prenoms: string | null;
  full_name: string | null;
  birth_date: string | null;
  lieu_naissance: string | null;
  adresse_rue: string | null;
  adresse_code_postal: string | null;
  adresse_ville: string | null;
  adresse_pays: string | null;
  profession: string | null;
  telephone: string | null;
  lien_parente: string | null;
  ordre: number | null;
  status: string | null;
  email_notification: string | null;
  est_declarant: boolean | null;
  declaration_id: string | null;
}

const defaultFormValues: HeritierFormValues = {
  civilite: "M." as const,
  nom_naissance: "",
  nom_usage: "",
  prenoms: "",
  birth_date: undefined as unknown as Date,
  lieu_naissance: "",
  adresse_rue: "",
  adresse_code_postal: "",
  adresse_ville: "",
  adresse_pays: "France",
  profession: "",
  telephone: "",
  lien_parente: "",
  ordre: "" as unknown as number,
  status: "non_precise",
  email_notification: "",
  est_declarant: false,
};

const Etape2Heritiers = () => {
  const navigate = useNavigate();
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [heritiers, setHeritiers] = useState<Heritier[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeclarantWarning, setShowDeclarantWarning] = useState(false);
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
    if (data) setHeritiers(data as unknown as Heritier[]);
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
    form.reset({
      civilite: (h.civilite === "Mme" ? "Mme" : "M.") as "M." | "Mme",
      nom_naissance: h.nom_naissance ?? "",
      nom_usage: h.nom_usage ?? "",
      prenoms: h.prenoms ?? "",
      birth_date: h.birth_date ? new Date(h.birth_date) : (undefined as unknown as Date),
      lieu_naissance: h.lieu_naissance ?? "",
      adresse_rue: h.adresse_rue ?? "",
      adresse_code_postal: h.adresse_code_postal ?? "",
      adresse_ville: h.adresse_ville ?? "",
      adresse_pays: h.adresse_pays ?? "France",
      profession: h.profession ?? "",
      telephone: h.telephone ?? "",
      lien_parente: h.lien_parente ?? "",
      ordre: (h.ordre ?? "") as unknown as number,
      status: h.status ?? "non_precise",
      email_notification: h.email_notification ?? "",
      est_declarant: !!h.est_declarant,
    });
    setDialogOpen(true);
  };

  const onSubmitHeritier = async (values: HeritierFormValues) => {
    if (!declarationId) return;
    setSaving(true);

    const fullName = `${values.nom_naissance} ${values.prenoms}`.trim();

    const payload = {
      declaration_id: declarationId,
      civilite: values.civilite,
      nom_naissance: values.nom_naissance,
      nom_usage: values.nom_usage || null,
      prenoms: values.prenoms,
      full_name: fullName,
      birth_date: values.birth_date ? format(values.birth_date, "yyyy-MM-dd") : null,
      lieu_naissance: values.lieu_naissance || null,
      adresse_rue: values.adresse_rue || null,
      adresse_code_postal: values.adresse_code_postal || null,
      adresse_ville: values.adresse_ville || null,
      adresse_pays: values.adresse_pays || null,
      profession: values.profession || null,
      telephone: values.telephone || null,
      lien_parente: values.lien_parente,
      ordre: values.ordre ? Number(values.ordre) : null,
      status: values.status,
      email_notification: values.email_notification || null,
      est_declarant: !!values.est_declarant,
    };

    await track(async () => {
      let savedId = editingId;
      if (editingId) {
        await supabase.from("heritiers").update(payload).eq("id", editingId);
      } else {
        const { data: inserted } = await supabase
          .from("heritiers")
          .insert(payload)
          .select("id")
          .single();
        savedId = inserted?.id ?? null;
      }

      // Enforce single declarant: uncheck others
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
    if (!hasDeclarant && !showDeclarantWarning) {
      setShowDeclarantWarning(true);
      // Non-blocking: continue anyway after showing once
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
  const hasDeclarant = heritiers.some((h) => h.est_declarant);

  const formatAdresse = (h: Heritier) => {
    const parts = [h.adresse_rue, h.adresse_code_postal, h.adresse_ville].filter(Boolean);
    return parts.join(", ");
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

      {/* Alerts */}
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

      {showDeclarantWarning && !hasDeclarant && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Vous n'avez pas désigné l'héritier signataire de la DS. Le premier
            héritier acceptant sera utilisé par défaut. Vous pourrez le modifier.
          </AlertDescription>
        </Alert>
      )}

      {/* Heritiers list */}
      {heritiers.length > 0 ? (
        <div className="space-y-3 mb-6">
          {heritiers.map((h) => {
            const adresse = formatAdresse(h);
            return (
              <Card key={h.id}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{h.full_name}</p>
                      {h.est_declarant && (
                        <Badge variant="secondary" className="gap-1">
                          <PenLine className="h-3 w-3" />
                          Déclarant(e)
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {h.lien_parente}
                      {h.birth_date &&
                        ` · né(e) le ${format(new Date(h.birth_date), "dd/MM/yyyy")}`}
                    </p>
                    {adresse && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {adresse}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {STATUTS.find((s) => s.value === h.status)?.label ??
                        h.status}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(h)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteHeritier(h.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                        className="flex gap-6 mt-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="M." id="civ-m" />
                          <Label htmlFor="civ-m" className="cursor-pointer">M.</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Mme" id="civ-mme" />
                          <Label htmlFor="civ-mme" className="cursor-pointer">Mme</Label>
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
                        <Input placeholder="(optionnel)" {...field} />
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

              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium">Adresse</p>
                <FormField
                  control={form.control}
                  name="adresse_rue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rue</FormLabel>
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
                        <FormMessage />
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
                        <FormMessage />
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
                        <FormMessage />
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
                        <Input placeholder="(optionnel)" {...field} />
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
                name="lien_parente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lien de parenté avec le défunt *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
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
                          <div
                            key={s.value}
                            className="flex items-center space-x-2"
                          >
                            <RadioGroupItem
                              value={s.value}
                              id={`status-${s.value}`}
                            />
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
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        C'est cet héritier qui signera la déclaration
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Un seul héritier peut être désigné signataire. Cocher
                        ici décochera automatiquement les autres.
                      </p>
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
                  {saving
                    ? "Enregistrement…"
                    : editingId
                    ? "Modifier"
                    : "Ajouter"}
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
