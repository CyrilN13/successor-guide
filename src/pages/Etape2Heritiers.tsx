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
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

const heritierSchema = z.object({
  full_name: z.string().trim().min(1, "Le nom est requis").max(100),
  prenoms: z.string().trim().min(1, "Les prénoms sont requis").max(200),
  birth_date: z.date({ required_error: "La date de naissance est requise" }),
  lien_parente: z.string().min(1, "Le lien de parenté est requis"),
  ordre: z.coerce.number().int().positive().optional().or(z.literal("")),
  status: z.string().min(1, "Le statut est requis"),
  email_notification: z.string().email("Email invalide").optional().or(z.literal("")),
});

type HeritierFormValues = z.infer<typeof heritierSchema>;

interface Heritier {
  id: string;
  full_name: string;
  birth_date: string | null;
  lien_parente: string | null;
  ordre: number | null;
  status: string | null;
  email_notification: string | null;
  declaration_id: string | null;
}

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
    defaultValues: {
      full_name: "",
      prenoms: "",
      lien_parente: "",
      ordre: "",
      status: "non_precise",
      email_notification: "",
    },
  });

  const loadHeritiers = useCallback(async (declId: string) => {
    const { data } = await supabase
      .from("heritiers")
      .select("*")
      .eq("declaration_id", declId)
      .order("ordre", { ascending: true, nullsFirst: false });
    if (data) setHeritiers(data);
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
    form.reset({
      full_name: "",
      prenoms: "",
      lien_parente: "",
      ordre: "",
      status: "non_precise",
      email_notification: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (h: Heritier) => {
    setEditingId(h.id);
    // Extract prenoms from details or split full_name
    const parts = (h.full_name ?? "").split(" ");
    const nom = parts[0] ?? "";
    const prenoms = parts.slice(1).join(" ") ?? "";
    form.reset({
      full_name: nom,
      prenoms,
      birth_date: h.birth_date ? new Date(h.birth_date) : undefined as any,
      lien_parente: h.lien_parente ?? "",
      ordre: h.ordre ?? ("" as any),
      status: h.status ?? "non_precise",
      email_notification: h.email_notification ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmitHeritier = async (values: HeritierFormValues) => {
    if (!declarationId) return;
    setSaving(true);

    const payload = {
      declaration_id: declarationId,
      full_name: `${values.full_name} ${values.prenoms}`.trim(),
      birth_date: values.birth_date ? format(values.birth_date, "yyyy-MM-dd") : null,
      lien_parente: values.lien_parente,
      ordre: values.ordre ? Number(values.ordre) : null,
      status: values.status,
      email_notification: values.email_notification || null,
    };

    await track(async () => {
      if (editingId) {
        await supabase.from("heritiers").update(payload).eq("id", editingId);
      } else {
        await supabase.from("heritiers").insert(payload);
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

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
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

      {/* Heritiers list */}
      {heritiers.length > 0 ? (
        <div className="space-y-3 mb-6">
          {heritiers.map((h) => (
            <Card key={h.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{h.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {h.lien_parente}
                    {h.birth_date &&
                      ` · né(e) le ${format(new Date(h.birth_date), "dd/MM/yyyy")}`}
                  </p>
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
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet *</FormLabel>
                    <FormControl>
                      <Input placeholder="Dupont" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
