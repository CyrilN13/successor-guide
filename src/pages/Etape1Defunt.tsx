import { useEffect, useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Info } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { SaveIndicator, type SaveStatus } from "@/components/SaveIndicator";
import ModeIaSourcePreview from "@/components/ModeIaSourcePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const NATIONALITES = [
  "Française",
  "Allemande",
  "Belge",
  "Britannique",
  "Espagnole",
  "Italienne",
  "Luxembourgeoise",
  "Portugaise",
  "Suisse",
  "Autre",
];

const SITUATIONS_MATRIMONIALES = [
  "Célibataire",
  "Marié(e)",
  "Pacsé(e)",
  "Divorcé(e)",
  "Veuf(ve)",
];

const REGIMES_MATRIMONIAUX = [
  "Communauté réduite aux acquêts",
  "Communauté universelle",
  "Séparation de biens",
  "Participation aux acquêts",
  "Autre ou inconnu",
];

const defuntSchema = z
  .object({
    nom_naissance: z.string().trim().min(1, "Le nom de naissance est requis").max(100),
    nom_usage: z.string().trim().max(100).optional().or(z.literal("")),
    prenoms: z.string().trim().min(1, "Les prénoms sont requis").max(200),
    birth_date: z.date({ required_error: "La date de naissance est requise" }),
    lieu_naissance: z.string().trim().min(1, "Le lieu de naissance est requis").max(200),
    death_date: z.date({ required_error: "La date de décès est requise" }),
    lieu_deces: z.string().trim().min(1, "Le lieu de décès est requis").max(200),
    adresse_rue: z.string().trim().min(1, "L'adresse est requise").max(300),
    adresse_code_postal: z.string().trim().min(1, "Le code postal est requis").max(10),
    adresse_ville: z.string().trim().min(1, "La ville est requise").max(100),
    adresse_pays: z.string().trim().min(1, "Le pays est requis").max(100),
    nationalite: z.string().min(1, "La nationalité est requise"),
    situation_matrimoniale: z.string().min(1, "La situation matrimoniale est requise"),
    regime_matrimonial: z.string().optional().or(z.literal("")),
  })
  .refine(
    (d) => d.birth_date < new Date(),
    { message: "La date de naissance doit être dans le passé", path: ["birth_date"] }
  )
  .refine(
    (d) => d.death_date <= new Date(),
    { message: "La date de décès ne peut pas être dans le futur", path: ["death_date"] }
  )
  .refine(
    (d) => d.death_date >= d.birth_date,
    { message: "La date de décès doit être postérieure à la date de naissance", path: ["death_date"] }
  );

type DefuntFormValues = z.infer<typeof defuntSchema>;

const Etape1Defunt = () => {
  const navigate = useNavigate();
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const initialLoadDone = useRef(false);
  const savedTimer = useRef<number | null>(null);

  const form = useForm<DefuntFormValues>({
    resolver: zodResolver(defuntSchema),
    defaultValues: {
      nom_naissance: "",
      nom_usage: "",
      prenoms: "",
      lieu_naissance: "",
      lieu_deces: "",
      adresse_rue: "",
      adresse_code_postal: "",
      adresse_ville: "",
      adresse_pays: "France",
      nationalite: "Française",
      situation_matrimoniale: "",
      regime_matrimonial: "",
    },
  });

  const watched = form.watch();
  // Stringify so useDebounce sees a stable primitive — avoids infinite loop
  // (form.watch() returns a new object reference on every render).
  const watchedKey = JSON.stringify(watched, (_k, v) =>
    v instanceof Date ? v.toISOString() : v
  );
  const debouncedKey = useDebounce(watchedKey, 800);

  const situationMatrimoniale = form.watch("situation_matrimoniale");
  const showRegime = situationMatrimoniale === "Marié(e)";

  // Load declaration and existing defunt data
  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem("deesse_token");
      if (!token) return;

      const { data: decl } = await supabase
        .from("declarations")
        .select("id")
        .eq("anonymous_token", token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!decl) return;
      setDeclarationId(decl.id);

      const { data: defunt } = await supabase
        .from("defunts")
        .select("*")
        .eq("declaration_id", decl.id)
        .maybeSingle();

      if (defunt) {
        const details = ((defunt as any).details as Record<string, string>) ?? {};
        form.reset({
          nom_naissance: defunt.full_name?.split(" ")[0] ?? "",
          nom_usage: details.nom_usage ?? "",
          prenoms: details.prenoms ?? "",
          birth_date: defunt.birth_date ? new Date(defunt.birth_date) : undefined as any,
          lieu_naissance: details.lieu_naissance ?? "",
          death_date: defunt.death_date ? new Date(defunt.death_date) : undefined as any,
          lieu_deces: defunt.death_place ?? "",
          adresse_rue: details.adresse_rue ?? "",
          adresse_code_postal: details.adresse_code_postal ?? "",
          adresse_ville: details.adresse_ville ?? "",
          adresse_pays: details.adresse_pays ?? "France",
          nationalite: defunt.nationality ?? "Française",
          situation_matrimoniale: defunt.marital_status ?? "",
          regime_matrimonial: defunt.matrimonial_regime ?? "",
        });
      }
      // Allow autosave to start AFTER initial reset propagates
      setTimeout(() => {
        initialLoadDone.current = true;
      }, 100);
    };
    loadData();
  }, [form]);

  // Auto-save (debounced via useDebounce on watched form values)
  const autoSave = useCallback(async (values: DefuntFormValues) => {
    if (!declarationId) return;

    const payload = {
      declaration_id: declarationId,
      full_name: `${values.nom_naissance ?? ""} ${values.prenoms ?? ""}`.trim() || null,
      birth_date: values.birth_date ? format(values.birth_date, "yyyy-MM-dd") : null,
      death_date: values.death_date ? format(values.death_date, "yyyy-MM-dd") : null,
      death_place: values.lieu_deces || null,
      domicile: [values.adresse_rue, values.adresse_code_postal, values.adresse_ville, values.adresse_pays]
        .filter(Boolean)
        .join(", ") || null,
      nationality: values.nationalite || null,
      marital_status: values.situation_matrimoniale || null,
      matrimonial_regime: showRegime ? values.regime_matrimonial || null : null,
      details: {
        nom_naissance: values.nom_naissance,
        nom_usage: values.nom_usage,
        prenoms: values.prenoms,
        lieu_naissance: values.lieu_naissance,
        adresse_rue: values.adresse_rue,
        adresse_code_postal: values.adresse_code_postal,
        adresse_ville: values.adresse_ville,
        adresse_pays: values.adresse_pays,
      },
    };

    setSaveStatus("saving");
    const { error } = await (supabase.from("defunts") as any).upsert(payload, { onConflict: "declaration_id" });
    if (error) {
      console.error("Erreur autosave défunt:", error);
      setSaveStatus("idle");
      toast.error("Échec de l'enregistrement : " + error.message);
      return;
    }
    setSaveStatus("saved");
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaveStatus("idle"), 1500);
  }, [declarationId, showRegime]);

  // Trigger autosave whenever the *serialized* values actually change
  // (after initial load). Using the string key prevents the object-identity
  // loop that made the indicator flash "Sauvegarde…" forever.
  useEffect(() => {
    if (!declarationId || !initialLoadDone.current) return;
    autoSave(form.getValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKey, declarationId]);

  const onSubmit = async (values: DefuntFormValues) => {
    if (!declarationId) return;
    setSaving(true);

    await autoSave(values);
    await supabase
      .from("declarations")
      .update({ current_step: 1 })
      .eq("id", declarationId);

    setSaving(false);
    navigate("/etape/2");
  };

  const onInvalid = () => {
    // Scroll to first error so the user understands why nothing happened
    const firstError = document.querySelector('[aria-invalid="true"]');
    firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // No-op kept for compatibility with existing onBlur handlers — autosave is now reactive via useDebounce
  const handleFieldBlur = useCallback(() => {}, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SaveIndicator status={saveStatus} />
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            Étape 1 sur 6 — Le défunt
          </span>
          <span className="text-sm text-muted-foreground">2 / 7</span>
        </div>
        <Progress value={(2 / 7) * 100} className="h-2" />
      </div>

      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
        Identification du défunt
      </h1>
      <p className="text-muted-foreground mb-8">
        Renseignez les informations d'état civil de la personne décédée.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          {/* État civil */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-heading text-lg font-semibold">État civil</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nom_naissance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de naissance *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Dupont"
                          {...field}
                          onBlur={() => { field.onBlur(); handleFieldBlur(); }}
                        />
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
                        <Input
                          placeholder="Optionnel"
                          {...field}
                          onBlur={() => { field.onBlur(); handleFieldBlur(); }}
                        />
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
                      <Input
                        placeholder="Jean Pierre Marie"
                        {...field}
                        onBlur={() => { field.onBlur(); handleFieldBlur(); }}
                      />
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
                          onChange={(d) => { field.onChange(d); handleFieldBlur(); }}
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
                      <FormLabel>Lieu de naissance *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Paris"
                          {...field}
                          onBlur={() => { field.onBlur(); handleFieldBlur(); }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="death_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de décès *</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value}
                          onChange={(d) => { field.onChange(d); handleFieldBlur(); }}
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
                  name="lieu_deces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu de décès *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Lyon"
                          {...field}
                          onBlur={() => { field.onBlur(); handleFieldBlur(); }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-heading text-lg font-semibold">
                Dernière adresse connue
              </h2>

              <FormField
                control={form.control}
                name="adresse_rue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rue *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12 rue de la Paix"
                        {...field}
                        onBlur={() => { field.onBlur(); handleFieldBlur(); }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="adresse_code_postal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code postal *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="75002"
                          {...field}
                          onBlur={() => { field.onBlur(); handleFieldBlur(); }}
                        />
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
                      <FormLabel>Ville *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Paris"
                          {...field}
                          onBlur={() => { field.onBlur(); handleFieldBlur(); }}
                        />
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
                      <FormLabel>Pays *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="France"
                          {...field}
                          onBlur={() => { field.onBlur(); handleFieldBlur(); }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Nationalité & Situation */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <h2 className="font-heading text-lg font-semibold">
                Nationalité et situation
              </h2>

              <FormField
                control={form.control}
                name="nationalite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationalité *</FormLabel>
                    <Select
                      onValueChange={(v) => { field.onChange(v); handleFieldBlur(); }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NATIONALITES.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
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
                name="situation_matrimoniale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situation matrimoniale *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(v) => { field.onChange(v); handleFieldBlur(); }}
                        value={field.value}
                        className="flex flex-wrap gap-4 mt-2"
                      >
                        {SITUATIONS_MATRIMONIALES.map((s) => (
                          <div key={s} className="flex items-center space-x-2">
                            <RadioGroupItem value={s} id={`sit-${s}`} />
                            <Label htmlFor={`sit-${s}`} className="cursor-pointer text-sm">
                              {s}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showRegime && (
                <FormField
                  control={form.control}
                  name="regime_matrimonial"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Régime matrimonial</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-sm">
                            Le régime matrimonial détermine comment les biens ont été
                            accumulés pendant le mariage. En cas de doute, consultez
                            votre contrat de mariage ou un livret de famille.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select
                        onValueChange={(v) => { field.onChange(v); handleFieldBlur(); }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le régime" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REGIMES_MATRIMONIAUX.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/diagnostic")}
            >
              Précédent
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving ? "Enregistrement…" : "Sauvegarder et continuer"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default Etape1Defunt;
