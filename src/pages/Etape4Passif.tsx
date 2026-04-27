import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Upload, Info } from "lucide-react";

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

const TYPES_DETTE = [
  "Emprunt bancaire",
  "Facture",
  "Impôt",
  "Frais funéraires",
  "Charges courantes",
  "Autre",
];

const EXISTAIT_OPTIONS = [
  { value: "oui", label: "Oui" },
  { value: "probable", label: "Probable" },
  { value: "doute", label: "Doute" },
];

const passifSchema = z.object({
  libelle: z.string().trim().min(1, "Le libellé est requis").max(200),
  type_dette: z.string().min(1, "Le type de dette est requis"),
  creancier_nom: z.string().trim().max(200).optional().or(z.literal("")),
  creancier_adresse: z.string().trim().max(300).optional().or(z.literal("")),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  montant: z.coerce
    .number({ required_error: "Le montant est requis" })
    .positive("Le montant doit être positif"),
  existait_au_deces: z.string().min(1, "Ce champ est requis"),
  date_origine: z.date().optional(),
});

type PassifFormValues = z.infer<typeof passifSchema>;

interface PassifItem {
  id: string;
  libelle: string | null;
  type_dette: string | null;
  montant: number | null;
  existait_au_deces: string | null;
  justificatif_url: string | null;
  declaration_id: string | null;
  details: Record<string, any> | null;
  creancier_nom: string | null;
  creancier_adresse: string | null;
  reference: string | null;
}

const formatEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const Etape4Passif = () => {
  const navigate = useNavigate();
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [items, setItems] = useState<PassifItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { status: saveStatus, track } = useSaveStatus();

  const form = useForm<PassifFormValues>({
    resolver: zodResolver(passifSchema),
    defaultValues: {
      libelle: "",
      type_dette: "",
      creancier_nom: "",
      creancier_adresse: "",
      reference: "",
      montant: "" as any,
      existait_au_deces: "oui",
    },
  });

  const loadItems = useCallback(async (declId: string) => {
    const { data } = await supabase
      .from("passif_items")
      .select("*")
      .eq("declaration_id", declId);
    if (data) setItems(data as unknown as PassifItem[]);
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
        loadItems(decl.id);
      }
    };
    init();
  }, [loadItems]);

  const totalPassif = items.reduce((s, i) => s + (i.montant ?? 0), 0);

  const openAdd = () => {
    setEditingId(null);
    setFile(null);
    form.reset({
      libelle: "",
      type_dette: "",
      creancier_nom: "",
      creancier_adresse: "",
      reference: "",
      montant: "" as any,
      existait_au_deces: "oui",
      date_origine: undefined,
    });
    setDialogOpen(true);
  };

  const openEdit = (item: PassifItem) => {
    setEditingId(item.id);
    setFile(null);
    const details = item.details ?? {};
    form.reset({
      libelle: item.libelle ?? "",
      type_dette: item.type_dette ?? "",
      creancier_nom: item.creancier_nom ?? (details.creancier as string) ?? "",
      creancier_adresse: item.creancier_adresse ?? "",
      reference: item.reference ?? "",
      montant: (item.montant ?? "") as any,
      existait_au_deces: item.existait_au_deces ?? "oui",
      date_origine: details.date_origine
        ? new Date(details.date_origine as string)
        : undefined,
    });
    setDialogOpen(true);
  };

  const uploadFile = async (itemId: string): Promise<string | null> => {
    if (!file || !declarationId) return null;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${declarationId}/passif/${itemId}.${ext}`;
    const { error } = await supabase.storage
      .from("uploads")
      .upload(path, file, { upsert: true });
    setUploading(false);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    return path;
  };

  const onSubmit = async (values: PassifFormValues) => {
    if (!declarationId) return;
    setSaving(true);

    const details: Record<string, any> = {};
    if (values.date_origine) {
      details.date_origine = format(values.date_origine, "yyyy-MM-dd");
    }

    const payload = {
      declaration_id: declarationId,
      libelle: values.libelle,
      type_dette: values.type_dette,
      creancier_nom: values.creancier_nom || null,
      creancier_adresse: values.creancier_adresse || null,
      reference: values.reference || null,
      montant: values.montant,
      existait_au_deces: values.existait_au_deces,
      details,
    };

    let itemId = editingId;

    await track(async () => {
      if (editingId) {
        await (supabase.from("passif_items") as any)
          .update(payload)
          .eq("id", editingId);
      } else {
        const { data } = await (supabase.from("passif_items") as any)
          .insert(payload)
          .select("id")
          .single();
        if (data) itemId = data.id;
      }

      // Upload justificatif if provided
      if (file && itemId) {
        const filePath = await uploadFile(itemId);
        if (filePath) {
          await (supabase.from("passif_items") as any)
            .update({ justificatif_url: filePath })
            .eq("id", itemId);
        }
      }
    });

    await loadItems(declarationId);
    setSaving(false);
    setDialogOpen(false);
  };

  const deleteItem = async (id: string) => {
    if (!declarationId) return;
    await track(() => supabase.from("passif_items").delete().eq("id", id) as any);
    await loadItems(declarationId);
  };

  const handleContinue = async () => {
    if (!declarationId) return;
    await supabase
      .from("declarations")
      .update({ current_step: 4 })
      .eq("id", declarationId);
    navigate("/etape/5");
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <ModeIaSourcePreview />
      <SaveIndicator status={saveStatus} />
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            Étape 4 sur 6 — Le passif
          </span>
          <span className="text-sm text-muted-foreground">5 / 7</span>
        </div>
        <Progress value={(5 / 7) * 100} className="h-2" />
      </div>

      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
        Passif successoral
      </h1>
      <p className="text-muted-foreground mb-4">
        Listez toutes les dettes connues du défunt.
      </p>

      {/* Note explicative */}
      <Alert className="mb-6 border-muted bg-muted/30">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Listez ici toutes les dettes connues. La déductibilité fiscale sera
          appréciée par l'administration — vous n'avez pas à qualifier
          juridiquement chaque dette.
        </AlertDescription>
      </Alert>

      {/* Total */}
      <Card className="mb-8 border-accent/30 bg-accent/5">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="font-medium">Passif total</span>
          <span className="font-heading text-xl font-bold">
            {formatEur(totalPassif)}
          </span>
        </CardContent>
      </Card>

      {/* Items list */}
      {items.length > 0 ? (
        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.libelle}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.type_dette} · {formatEur(item.montant ?? 0)}
                  </p>
                  {item.justificatif_url && (
                    <p className="text-xs text-accent mt-0.5">
                      Justificatif joint
                    </p>
                  )}
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
            Aucune dette ajoutée pour le moment.
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={openAdd} className="mb-8">
        <Plus className="h-4 w-4 mr-2" />
        Ajouter une dette
      </Button>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => navigate("/etape/3")}>
          Précédent
        </Button>
        <Button
          onClick={handleContinue}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Sauvegarder et continuer
        </Button>
      </div>

      {/* ─── Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingId ? "Modifier la dette" : "Ajouter une dette"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 mt-2"
            >
              <FormField
                control={form.control}
                name="libelle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Emprunt immobilier Crédit Mutuel"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type_dette"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de dette *</FormLabel>
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
                        {TYPES_DETTE.map((t) => (
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
                name="creancier_nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du créancier</FormLabel>
                    <FormControl>
                      <Input placeholder="Crédit Mutuel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="creancier_adresse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse du créancier</FormLabel>
                    <FormControl>
                      <Input placeholder="12 rue de la République, 75001 Paris" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence / numéro de contrat</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex : CR-2024-001234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (€) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="15 000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="existait_au_deces"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Existait au jour du décès ? *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4 mt-2"
                      >
                        {EXISTAIT_OPTIONS.map((o) => (
                          <div
                            key={o.value}
                            className="flex items-center space-x-2"
                          >
                            <RadioGroupItem
                              value={o.value}
                              id={`existait-${o.value}`}
                            />
                            <Label
                              htmlFor={`existait-${o.value}`}
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

              <FormField
                control={form.control}
                name="date_origine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'origine (optionnel)</FormLabel>
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

              {/* File upload */}
              <div className="space-y-2">
                <Label>Justificatif (optionnel)</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("passif-file-input")?.click()
                    }
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {file ? "Changer" : "Choisir un fichier"}
                  </Button>
                  {file && (
                    <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {file.name}
                    </span>
                  )}
                </div>
                <input
                  id="passif-file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

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
                  disabled={saving || uploading}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {saving || uploading
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

export default Etape4Passif;
