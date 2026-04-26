import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInYears } from "date-fns";
import { Plus, Pencil, Trash2, Info } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { DateInput } from "@/components/ui/date-input";
import ModeIaSourcePreview from "@/components/ModeIaSourcePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const TYPES_DONATION = [
  "Somme d'argent",
  "Immobilier",
  "Titres",
  "Autre",
];

const ENREGISTREE_OPTIONS = [
  { value: "oui", label: "Oui" },
  { value: "non", label: "Non" },
  { value: "inconnu", label: "Je ne sais pas" },
];

const donationSchema = z.object({
  beneficiaire_name: z.string().trim().min(1, "Le bénéficiaire est requis").max(200),
  date_donation: z.date({ required_error: "La date de donation est requise" }),
  type_donation: z.string().min(1, "Le type est requis"),
  montant: z.coerce
    .number({ required_error: "Le montant est requis" })
    .positive("Le montant doit être positif"),
  enregistree: z.string().min(1, "Ce champ est requis"),
});

type DonationFormValues = z.infer<typeof donationSchema>;

interface DonationItem {
  id: string;
  beneficiaire_name: string | null;
  date_donation: string | null;
  type_donation: string | null;
  montant: number | null;
  enregistree_fiscalement: boolean | null;
  dans_15_ans: boolean | null;
  declaration_id: string | null;
}

const formatEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const Etape5Donations = () => {
  const navigate = useNavigate();
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [deathDate, setDeathDate] = useState<Date | null>(null);
  const [items, setItems] = useState<DonationItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { status: saveStatus, track } = useSaveStatus();

  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      beneficiaire_name: "",
      type_donation: "",
      montant: "" as any,
      enregistree: "",
    },
  });

  const watchedDate = form.watch("date_donation");

  // Calcul "dans 15 ans" en direct dans le formulaire
  const dans15AnsLive =
    watchedDate && deathDate
      ? differenceInYears(deathDate, watchedDate) < 15 &&
        watchedDate <= deathDate
      : false;

  const loadItems = useCallback(async (declId: string) => {
    const { data } = await supabase
      .from("donations")
      .select("*")
      .eq("declaration_id", declId)
      .order("date_donation", { ascending: false });
    if (data) setItems(data as unknown as DonationItem[]);
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
      if (!decl) return;
      setDeclarationId(decl.id);

      // Charger la date de décès depuis la table defunts
      const { data: defunt } = await supabase
        .from("defunts")
        .select("death_date")
        .eq("declaration_id", decl.id)
        .maybeSingle();
      if (defunt?.death_date) setDeathDate(new Date(defunt.death_date));

      loadItems(decl.id);
    };
    init();
  }, [loadItems]);

  const totalRappel = items
    .filter((d) => d.dans_15_ans)
    .reduce((s, d) => s + Number(d.montant ?? 0), 0);

  const computeDans15Ans = (dateDonation: Date): boolean => {
    if (!deathDate) return false;
    return (
      differenceInYears(deathDate, dateDonation) < 15 &&
      dateDonation <= deathDate
    );
  };

  const openAdd = () => {
    setEditingId(null);
    form.reset({
      beneficiaire_name: "",
      type_donation: "",
      montant: "" as any,
      enregistree: "",
      date_donation: undefined as any,
    });
    setDialogOpen(true);
  };

  const openEdit = (item: DonationItem) => {
    setEditingId(item.id);
    form.reset({
      beneficiaire_name: item.beneficiaire_name ?? "",
      date_donation: item.date_donation
        ? new Date(item.date_donation)
        : (undefined as any),
      type_donation: item.type_donation ?? "",
      montant: (item.montant ?? "") as any,
      enregistree:
        item.enregistree_fiscalement === true
          ? "oui"
          : item.enregistree_fiscalement === false
          ? "non"
          : "inconnu",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: DonationFormValues) => {
    if (!declarationId) return;
    setSaving(true);

    const dans15 = computeDans15Ans(values.date_donation);
    const enregistreeBool =
      values.enregistree === "oui"
        ? true
        : values.enregistree === "non"
        ? false
        : null;

    const payload = {
      declaration_id: declarationId,
      beneficiaire_name: values.beneficiaire_name,
      date_donation: format(values.date_donation, "yyyy-MM-dd"),
      type_donation: values.type_donation,
      montant: values.montant,
      enregistree_fiscalement: enregistreeBool,
      dans_15_ans: dans15,
    };

    await track(async () => {
      if (editingId) {
        await (supabase.from("donations") as any)
          .update(payload)
          .eq("id", editingId);
      } else {
        await (supabase.from("donations") as any).insert(payload);
      }
    });

    await loadItems(declarationId);
    setSaving(false);
    setDialogOpen(false);
  };

  const deleteItem = async (id: string) => {
    if (!declarationId) return;
    await track(
      () => supabase.from("donations").delete().eq("id", id) as any,
    );
    await loadItems(declarationId);
  };

  const handleContinue = async () => {
    if (!declarationId) return;
    await supabase
      .from("declarations")
      .update({ current_step: 5 })
      .eq("id", declarationId);
    navigate("/etape/6");
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SaveIndicator status={saveStatus} />

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            Étape 5 sur 6 — Donations antérieures
          </span>
          <span className="text-sm text-muted-foreground">6 / 7</span>
        </div>
        <Progress value={(6 / 7) * 100} className="h-2" />
      </div>

      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
        Donations antérieures
      </h1>
      <p className="text-muted-foreground mb-4">
        Recensez les donations effectuées par le défunt de son vivant.
      </p>

      {/* Note explicative */}
      <Alert className="mb-6 border-muted bg-muted/30">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Les donations effectuées au cours des 15 années précédant le décès
          doivent être rappelées dans la déclaration. Elles s'ajoutent à
          l'actif pour le calcul des abattements.
        </AlertDescription>
      </Alert>

      {!deathDate && (
        <Alert className="mb-6 border-accent bg-accent/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            La date de décès du défunt n'a pas été renseignée à l'étape 1.
            Le calcul automatique « dans les 15 ans » sera approximatif.
          </AlertDescription>
        </Alert>
      )}

      {/* Compteur */}
      <Card className="mb-8 border-accent/30 bg-accent/5">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="font-medium">Donations &lt; 15 ans à rappeler</span>
          <span className="font-heading text-xl font-bold">
            {formatEur(totalRappel)}
          </span>
        </CardContent>
      </Card>

      {/* Liste */}
      {items.length > 0 ? (
        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {item.beneficiaire_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.type_donation} · {formatEur(item.montant ?? 0)}
                    {item.date_donation &&
                      ` · ${format(new Date(item.date_donation), "dd/MM/yyyy")}`}
                  </p>
                  <p className="text-xs mt-0.5">
                    {item.dans_15_ans ? (
                      <span className="text-accent font-medium">
                        À rappeler (&lt; 15 ans)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Hors délai (&gt; 15 ans)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteItem(item.id)}
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
            Aucune donation enregistrée. Si le défunt n'a effectué aucune
            donation, vous pouvez passer à l'étape suivante.
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={openAdd} className="mb-8">
        <Plus className="h-4 w-4 mr-2" />
        Ajouter une donation
      </Button>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => navigate("/etape/4")}>
          Précédent
        </Button>
        <Button
          onClick={handleContinue}
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
              {editingId ? "Modifier la donation" : "Ajouter une donation"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 mt-2"
            >
              <FormField
                control={form.control}
                name="beneficiaire_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bénéficiaire *</FormLabel>
                    <FormControl>
                      <Input placeholder="Marie Dupont" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_donation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de la donation *</FormLabel>
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
                name="type_donation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
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
                        {TYPES_DONATION.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
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
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Montant ou valeur au jour de la donation (€) *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="50 000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enregistree"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enregistrée fiscalement ? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-wrap gap-4 mt-2"
                      >
                        {ENREGISTREE_OPTIONS.map((o) => (
                          <div
                            key={o.value}
                            className="flex items-center space-x-2"
                          >
                            <RadioGroupItem
                              value={o.value}
                              id={`enr-${o.value}`}
                            />
                            <Label
                              htmlFor={`enr-${o.value}`}
                              className="cursor-pointer text-sm"
                            >
                              {o.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Indicateur auto-calcul "dans 15 ans" */}
              {watchedDate && deathDate && (
                <Alert
                  className={
                    dans15AnsLive
                      ? "border-accent bg-accent/5"
                      : "border-muted bg-muted/30"
                  }
                >
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {dans15AnsLive ? (
                      <>
                        Cette donation date de{" "}
                        <strong>
                          moins de 15 ans avant le décès
                        </strong>{" "}
                        — elle sera rappelée dans la déclaration.
                      </>
                    ) : (
                      <>
                        Cette donation date de{" "}
                        <strong>plus de 15 ans avant le décès</strong> — elle
                        n'a pas à être rappelée fiscalement.
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

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

export default Etape5Donations;
