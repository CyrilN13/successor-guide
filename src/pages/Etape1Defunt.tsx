import { useEffect, useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Info } from "lucide-react";
import { toast } from "sonner";

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
import { Checkbox } from "@/components/ui/checkbox";
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
import { DEPARTEMENTS_FR } from "@/lib/departementsFR";

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
    civilite: z.enum(["M.", "Mme"], { required_error: "La civilité est requise" }),
    nom_naissance: z.string().trim().min(1, "Le nom de naissance est requis").max(100),
    nom_usage: z.string().trim().max(100).optional().or(z.literal("")),
    prenoms: z.string().trim().min(1, "Les prénoms sont requis").max(200),
    profession: z.string().trim().max(200).optional().or(z.literal("")),
    birth_date: z.date({ required_error: "La date de naissance est requise" }),
    ne_etranger: z.boolean().default(false),
    departement_naissance: z.string().optional().or(z.literal("")),
    pays_naissance: z.string().optional().or(z.literal("")),
    lieu_naissance: z.string().trim().min(1, "Le lieu (commune) de naissance est requis").max(200),
    death_date: z.date({ required_error: "La date de décès est requise" }),
    lieu_deces: z.string().trim().max(200).optional().or(z.literal("")),
    lieu_deces_ville: z.string().trim().min(1, "La ville du décès est requise").max(100),
    lieu_deces_code_postal: z.string().trim().regex(/^\d{5}$/, "Code postal à 5 chiffres requis"),
    lieu_deces_pays: z.string().trim().min(1, "Le pays du décès est requis").max(100),
    adresse_rue: z.string().trim().min(1, "L'adresse est requise").max(300),
    adresse_code_postal: z.string().trim().min(1, "Le code postal est requis").max(10),
    adresse_ville: z.string().trim().min(1, "La ville est requise").max(100),
    adresse_pays: z.string().trim().min(1, "Le pays est requis").max(100),
    nationalite: z.string().trim().min(1, "La nationalité est requise").max(100),
    resident_fiscal_france: z.boolean().default(true),
    testament_existe: z.boolean().default(false),
    testament_date: z.date().optional(),
    testament_lieu_depot: z.string().trim().max(300).optional().or(z.literal("")),
    situation_matrimoniale: z.string().min(1, "La situation matrimoniale est requise"),
    regime_matrimonial: z.string().optional().or(z.literal("")),

    // Conjoint
    conjoint_civilite: z.string().optional().or(z.literal("")),
    conjoint_nom_naissance: z.string().optional().or(z.literal("")),
    conjoint_nom_usage: z.string().optional().or(z.literal("")),
    conjoint_prenoms: z.string().optional().or(z.literal("")),
    conjoint_date_naissance: z.date().optional(),
    conjoint_lieu_naissance: z.string().optional().or(z.literal("")),
    date_mariage: z.date().optional(),
    lieu_mariage: z.string().optional().or(z.literal("")),
    date_pacs: z.date().optional(),
    date_deces_conjoint: z.date().optional(),
  })
  .refine((d) => d.birth_date < new Date(), {
    message: "La date de naissance doit être dans le passé",
    path: ["birth_date"],
  })
  .refine((d) => d.death_date <= new Date(), {
    message: "La date de décès ne peut pas être dans le futur",
    path: ["death_date"],
  })
  .refine((d) => d.death_date >= d.birth_date, {
    message: "La date de décès doit être postérieure à la date de naissance",
    path: ["death_date"],
  })
  .refine((d) => d.ne_etranger ? !!d.pays_naissance : !!d.departement_naissance, {
    message: "Précisez le département (ou cochez « né(e) à l'étranger »)",
    path: ["departement_naissance"],
  });

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
      civilite: undefined as any,
      nom_naissance: "",
      nom_usage: "",
      prenoms: "",
      profession: "",
      ne_etranger: false,
      departement_naissance: "",
      pays_naissance: "",
      lieu_naissance: "",
      lieu_deces: "",
      lieu_deces_ville: "",
      lieu_deces_code_postal: "",
      lieu_deces_pays: "France",
      adresse_rue: "",
      adresse_code_postal: "",
      adresse_ville: "",
      adresse_pays: "France",
      nationalite: "française",
      resident_fiscal_france: true,
      testament_existe: false,
      testament_date: undefined,
      testament_lieu_depot: "",
      situation_matrimoniale: "",
      regime_matrimonial: "",
      conjoint_civilite: "",
      conjoint_nom_naissance: "",
      conjoint_nom_usage: "",
      conjoint_prenoms: "",
      conjoint_lieu_naissance: "",
      lieu_mariage: "",
    },
  });

  const watched = form.watch();
  const watchedKey = JSON.stringify(watched, (_k, v) =>
    v instanceof Date ? v.toISOString() : v
  );
  const debouncedKey = useDebounce(watchedKey, 800);

  const situationMatrimoniale = form.watch("situation_matrimoniale");
  const neEtranger = form.watch("ne_etranger");
  const testamentExiste = form.watch("testament_existe");
  const showRegime = situationMatrimoniale === "Marié(e)";
  const showConjoint =
    situationMatrimoniale === "Marié(e)" ||
    situationMatrimoniale === "Pacsé(e)" ||
    situationMatrimoniale === "Veuf(ve)";
  const showMariage =
    situationMatrimoniale === "Marié(e)" || situationMatrimoniale === "Veuf(ve)";
  const showPacs = situationMatrimoniale === "Pacsé(e)";
  const showDecesConjoint = situationMatrimoniale === "Veuf(ve)";

  // Load
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
        const d = defunt as any;
        const details = (d.details as Record<string, string>) ?? {};
        form.reset({
          civilite: (d.civilite as "M." | "Mme") ?? (undefined as any),
          nom_naissance: d.nom_naissance ?? d.full_name?.split(" ")[0] ?? "",
          nom_usage: d.nom_usage ?? "",
          prenoms: d.prenoms ?? "",
          profession: d.profession ?? "",
          ne_etranger: !!d.pays_naissance && d.pays_naissance !== "France",
          departement_naissance: d.departement_naissance ?? "",
          pays_naissance: d.pays_naissance ?? "",
          birth_date: d.birth_date ? new Date(d.birth_date) : (undefined as any),
          lieu_naissance: d.commune_naissance ?? details.lieu_naissance ?? "",
          death_date: d.death_date ? new Date(d.death_date) : (undefined as any),
          lieu_deces: d.death_place ?? "",
          lieu_deces_ville: d.lieu_deces_ville ?? "",
          lieu_deces_code_postal: d.lieu_deces_code_postal ?? "",
          lieu_deces_pays: d.lieu_deces_pays ?? "France",
          adresse_rue: d.adresse_rue ?? details.adresse_rue ?? "",
          adresse_code_postal: d.adresse_code_postal ?? details.adresse_code_postal ?? "",
          adresse_ville: d.adresse_ville ?? details.adresse_ville ?? "",
          adresse_pays: d.adresse_pays ?? details.adresse_pays ?? "France",
          nationalite: d.nationality ?? "française",
          resident_fiscal_france: d.resident_fiscal_france ?? true,
          testament_existe: d.testament_existe ?? false,
          testament_date: d.testament_date ? new Date(d.testament_date) : undefined,
          testament_lieu_depot: d.testament_lieu_depot ?? "",
          situation_matrimoniale: d.marital_status ?? "",
          regime_matrimonial: d.matrimonial_regime ?? "",
          conjoint_civilite: d.conjoint_civilite ?? "",
          conjoint_nom_naissance: d.conjoint_nom_naissance ?? "",
          conjoint_nom_usage: d.conjoint_nom_usage ?? "",
          conjoint_prenoms: d.conjoint_prenoms ?? "",
          conjoint_date_naissance: d.conjoint_date_naissance ? new Date(d.conjoint_date_naissance) : undefined,
          conjoint_lieu_naissance: d.conjoint_lieu_naissance ?? "",
          date_mariage: d.date_mariage ? new Date(d.date_mariage) : undefined,
          lieu_mariage: d.lieu_mariage ?? "",
          date_pacs: d.date_pacs ? new Date(d.date_pacs) : undefined,
          date_deces_conjoint: d.date_deces_conjoint ? new Date(d.date_deces_conjoint) : undefined,
        });
      }
      setTimeout(() => {
        initialLoadDone.current = true;
      }, 100);
    };
    loadData();
  }, [form]);

  const fmtDate = (d?: Date) => (d ? format(d, "yyyy-MM-dd") : null);

  const autoSave = useCallback(
    async (values: DefuntFormValues) => {
      if (!declarationId) return;

      const fullName = `${values.nom_naissance ?? ""} ${values.prenoms ?? ""}`.trim() || null;
      const domicile =
        [values.adresse_rue, values.adresse_code_postal, values.adresse_ville, values.adresse_pays]
          .filter(Boolean)
          .join(", ") || null;

      const payload: Record<string, any> = {
        declaration_id: declarationId,
        civilite: values.civilite || null,
        nom_naissance: values.nom_naissance || null,
        nom_usage: values.nom_usage || null,
        prenoms: values.prenoms || null,
        profession: values.profession || null,
        full_name: fullName,
        birth_date: fmtDate(values.birth_date),
        death_date: fmtDate(values.death_date),
        death_place: values.lieu_deces || null,
        lieu_deces_ville: values.lieu_deces_ville || null,
        lieu_deces_code_postal: values.lieu_deces_code_postal || null,
        lieu_deces_pays: values.lieu_deces_pays || null,
        departement_naissance: values.ne_etranger ? null : values.departement_naissance || null,
        pays_naissance: values.ne_etranger ? values.pays_naissance || null : "France",
        commune_naissance: values.lieu_naissance || null,
        domicile,
        adresse_rue: values.adresse_rue || null,
        adresse_code_postal: values.adresse_code_postal || null,
        adresse_ville: values.adresse_ville || null,
        adresse_pays: values.adresse_pays || null,
        nationality: values.nationalite || null,
        resident_fiscal_france: values.resident_fiscal_france,
        testament_existe: values.testament_existe,
        testament_date: values.testament_existe ? fmtDate(values.testament_date) : null,
        testament_lieu_depot: values.testament_existe ? (values.testament_lieu_depot || null) : null,
        marital_status: values.situation_matrimoniale || null,
        matrimonial_regime: showRegime ? values.regime_matrimonial || null : null,

        conjoint_civilite: showConjoint ? values.conjoint_civilite || null : null,
        conjoint_nom_naissance: showConjoint ? values.conjoint_nom_naissance || null : null,
        conjoint_nom_usage: showConjoint ? values.conjoint_nom_usage || null : null,
        conjoint_prenoms: showConjoint ? values.conjoint_prenoms || null : null,
        conjoint_date_naissance: showConjoint ? fmtDate(values.conjoint_date_naissance) : null,
        conjoint_lieu_naissance: showConjoint ? values.conjoint_lieu_naissance || null : null,
        date_mariage: showMariage ? fmtDate(values.date_mariage) : null,
        lieu_mariage: showMariage ? values.lieu_mariage || null : null,
        date_pacs: showPacs ? fmtDate(values.date_pacs) : null,
        date_deces_conjoint: showDecesConjoint ? fmtDate(values.date_deces_conjoint) : null,

        details: {
          lieu_naissance: values.lieu_naissance,
          adresse_rue: values.adresse_rue,
          adresse_code_postal: values.adresse_code_postal,
          adresse_ville: values.adresse_ville,
          adresse_pays: values.adresse_pays,
        },
      };

      setSaveStatus("saving");
      const { error } = await (supabase.from("defunts") as any).upsert(payload, {
        onConflict: "declaration_id",
      });
      if (error) {
        console.error("Erreur autosave défunt:", error);
        setSaveStatus("idle");
        toast.error("Échec de l'enregistrement : " + error.message);
        return;
      }
      setSaveStatus("saved");
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSaveStatus("idle"), 1500);
    },
    [declarationId, showRegime, showConjoint, showMariage, showPacs, showDecesConjoint]
  );

  useEffect(() => {
    if (!declarationId || !initialLoadDone.current) return;
    autoSave(form.getValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKey, declarationId]);

  const onSubmit = async (values: DefuntFormValues) => {
    if (!declarationId) return;
    setSaving(true);
    await autoSave(values);
    await supabase.from("declarations").update({ current_step: 1 }).eq("id", declarationId);
    setSaving(false);
    navigate("/etape/2");
  };

  const onInvalid = () => {
    const firstError = document.querySelector('[aria-invalid="true"]');
    firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleFieldBlur = useCallback(() => {}, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <ModeIaSourcePreview />
      <SaveIndicator status={saveStatus} />

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

              {/* Civilité */}
              <FormField
                control={form.control}
                name="civilite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Civilité *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(v) => { field.onChange(v); handleFieldBlur(); }}
                        value={field.value}
                        className="flex gap-6 mt-2"
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
                      <div className="flex items-center gap-2">
                        <FormLabel>Nom d'usage</FormLabel>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-sm">
                            Nom utilisé après mariage ou usage commun. Laisser vide si identique au nom de naissance.
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
                      <Input placeholder="Jean Pierre Marie" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Profession</FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-sm">
                          Profession exercée au jour du décès, ou ancienne profession si retraité(e).
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FormControl>
                      <Input placeholder="Optionnel" {...field} />
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
                          onChange={(d) => field.onChange(d)}
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
                      <FormLabel>Commune de naissance *</FormLabel>
                      <FormControl>
                        <Input placeholder="Paris" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Né(e) à l'étranger */}
              <FormField
                control={form.control}
                name="ne_etranger"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ne-etranger"
                        checked={!!field.value}
                        onCheckedChange={(c) => {
                          const checked = !!c;
                          field.onChange(checked);
                          if (checked) {
                            form.setValue("departement_naissance", "");
                          } else {
                            form.setValue("pays_naissance", "");
                          }
                        }}
                      />
                      <Label htmlFor="ne-etranger" className="cursor-pointer text-sm">
                        Né(e) à l'étranger
                      </Label>
                    </div>
                  </FormItem>
                )}
              />

              {!neEtranger && (
                <FormField
                  control={form.control}
                  name="departement_naissance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Département de naissance *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un département" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-72">
                          {DEPARTEMENTS_FR.map((d) => (
                            <SelectItem key={d.code} value={d.code}>
                              {d.code} — {d.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {neEtranger && (
                <FormField
                  control={form.control}
                  name="pays_naissance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays de naissance *</FormLabel>
                      <FormControl>
                        <Input placeholder="Maroc, Italie, …" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="death_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de décès *</FormLabel>
                    <FormControl>
                      <DateInput
                        value={field.value}
                        onChange={(d) => field.onChange(d)}
                        onBlur={field.onBlur}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <FormLabel>Rue / numéro *</FormLabel>
                    <FormControl>
                      <Input placeholder="12 rue de la Paix" {...field} />
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
                      <FormLabel>Ville *</FormLabel>
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
                      <FormLabel>Pays *</FormLabel>
                      <FormControl>
                        <Input placeholder="France" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                        onValueChange={field.onChange}
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
                      <Select onValueChange={field.onChange} value={field.value}>
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

          {/* Conjoint */}
          {showConjoint && (
            <Card className="border-accent/40">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-heading text-lg font-semibold">
                  Informations sur le conjoint(e)
                </h2>

                <FormField
                  control={form.control}
                  name="conjoint_civilite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Civilité</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value || ""}
                          className="flex gap-6 mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="M." id="conj-civ-m" />
                            <Label htmlFor="conj-civ-m" className="cursor-pointer">M.</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Mme" id="conj-civ-mme" />
                            <Label htmlFor="conj-civ-mme" className="cursor-pointer">Mme</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="conjoint_nom_naissance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de naissance</FormLabel>
                        <FormControl>
                          <Input placeholder="Martin" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="conjoint_nom_usage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom d'usage</FormLabel>
                        <FormControl>
                          <Input placeholder="Optionnel" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="conjoint_prenoms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénoms</FormLabel>
                      <FormControl>
                        <Input placeholder="Marie Claire" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="conjoint_date_naissance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de naissance</FormLabel>
                        <FormControl>
                          <DateInput
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            max={new Date().toISOString().split("T")[0]}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="conjoint_lieu_naissance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lieu de naissance</FormLabel>
                        <FormControl>
                          <Input placeholder="Bordeaux" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {showMariage && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date_mariage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date du mariage</FormLabel>
                          <FormControl>
                            <DateInput
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              max={new Date().toISOString().split("T")[0]}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lieu_mariage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lieu du mariage</FormLabel>
                          <FormControl>
                            <Input placeholder="Paris" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {showPacs && (
                  <FormField
                    control={form.control}
                    name="date_pacs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date du PACS</FormLabel>
                        <FormControl>
                          <DateInput
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            max={new Date().toISOString().split("T")[0]}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {showDecesConjoint && (
                  <FormField
                    control={form.control}
                    name="date_deces_conjoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de décès du conjoint(e)</FormLabel>
                        <FormControl>
                          <DateInput
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            max={new Date().toISOString().split("T")[0]}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => navigate("/diagnostic")}>
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
