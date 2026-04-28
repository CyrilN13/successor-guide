import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ModeIaSourcePreview from "@/components/ModeIaSourcePreview";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

import {
  ASSET_TYPES,
  ASSET_CONFIGS,
  buildSchema,
  type AssetTypeKey,
  type FieldDef,
  type AssetAlert,
} from "@/lib/actifConfigs";

interface ActifItem {
  id: string;
  type_bien: string | null;
  libelle: string | null;
  valeur_estimee: number | null;
  details: Record<string, any> | null;
  declaration_id: string | null;
  banque_nom?: string | null;
  banque_adresse?: string | null;
  numero_compte?: string | null;
  type_compte_precis?: string | null;
  detenu_en_indivision?: boolean | null;
  quote_part_pct?: number | null;
}

// Top-level columns persisted on actif_items (vs JSON in details)
const COMPTE_TOP_LEVEL_FIELDS = [
  "banque_nom",
  "banque_adresse",
  "numero_compte",
  "type_compte_precis",
  "detenu_en_indivision",
  "quote_part_pct",
] as const;

const formatEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

// ─── Dynamic field renderer ───
function RenderField({
  field: fieldDef,
  control,
}: {
  field: FieldDef;
  control: any;
}) {
  if (fieldDef.type === "checkbox") {
    return (
      <FormField
        control={control}
        name={fieldDef.name}
        render={({ field }) => (
          <FormItem
            className={`flex flex-row items-center space-x-2 space-y-0 ${
              fieldDef.colSpan === 2 ? "col-span-full" : ""
            }`}
          >
            <FormControl>
              <Checkbox
                checked={!!field.value}
                onCheckedChange={(c) => field.onChange(c === true)}
              />
            </FormControl>
            <FormLabel className="cursor-pointer font-normal">
              {fieldDef.label}
            </FormLabel>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }
  return (
    <FormField
      control={control}
      name={fieldDef.name}
      render={({ field }) => (
        <FormItem className={fieldDef.colSpan === 2 ? "col-span-full" : ""}>
          <FormLabel>
            {fieldDef.label}
            {fieldDef.required && " *"}
          </FormLabel>
          <FormControl>
            {fieldDef.type === "textarea" ? (
              <Textarea placeholder={fieldDef.placeholder} {...field} />
            ) : fieldDef.type === "select" ? (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {fieldDef.options?.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : fieldDef.type === "radio" ? (
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value ?? ""}
                className="space-y-2 mt-1"
              >
                {fieldDef.options?.map((o) => (
                  <div key={o.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={o.value} id={`${fieldDef.name}-${o.value}`} />
                    <Label htmlFor={`${fieldDef.name}-${o.value}`} className="cursor-pointer text-sm">
                      {o.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Input
                type={fieldDef.type === "number" ? "number" : "text"}
                step={fieldDef.type === "number" ? "0.01" : undefined}
                placeholder={fieldDef.placeholder}
                {...field}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ─── Alert renderer ───
function RenderAlerts({
  alerts,
  values,
}: {
  alerts?: AssetAlert[];
  values: Record<string, any>;
}) {
  if (!alerts) return null;
  return (
    <>
      {alerts
        .filter((a) => !a.condition || a.condition(values))
        .map((a, i) => (
          <Alert
            key={i}
            className={
              a.type === "warning"
                ? "border-accent bg-accent/5"
                : "border-muted bg-muted/30"
            }
          >
            <a.icon className="h-4 w-4" />
            <AlertDescription className="text-sm">{a.message}</AlertDescription>
          </Alert>
        ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// Sub-component: dialog form (own useForm scoped to type)
// ═══════════════════════════════════════════════════════
interface AssetDialogFormProps {
  type: AssetTypeKey;
  editingId: string | null;
  initialItem: ActifItem | null;
  onCancel: () => void;
  onSubmit: (values: Record<string, any>) => Promise<void>;
}

function AssetDialogForm({
  type,
  editingId,
  initialItem,
  onCancel,
  onSubmit,
}: AssetDialogFormProps) {
  const config = ASSET_CONFIGS[type];
  const schema = buildSchema(config);
  const [submitting, setSubmitting] = useState(false);

  const computeDefaults = (): Record<string, any> => {
    const defaults: Record<string, any> = Object.fromEntries(
      config.fields.map((f) => [
        f.name,
        f.defaultValue !== undefined
          ? f.defaultValue
          : f.type === "checkbox"
          ? false
          : "",
      ]),
    );
    if (initialItem) {
      const details = initialItem.details ?? {};
      const item = initialItem as Record<string, any>;
      for (const f of config.fields) {
        if (f.name === "libelle") defaults[f.name] = initialItem.libelle ?? "";
        else if (f.name === config.valeurField)
          defaults[f.name] =
            initialItem.valeur_estimee !== null && initialItem.valeur_estimee !== undefined
              ? String(initialItem.valeur_estimee)
              : "";
        else if (item[f.name] !== undefined && item[f.name] !== null) {
          // Top-level column on actif_items takes precedence over details JSON
          defaults[f.name] =
            f.type === "checkbox"
              ? item[f.name] === true
              : f.type === "number"
              ? String(item[f.name])
              : item[f.name];
        } else if (details[f.name] !== undefined && details[f.name] !== null) {
          defaults[f.name] =
            f.type === "checkbox" ? details[f.name] === true : details[f.name];
        }
      }
    } else if (type === "immobilier") {
      defaults.quote_part = "100";
    }
    return defaults;
  };

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: computeDefaults(),
  });

  const watchedValues = form.watch();

  const handleValid = async (values: Record<string, any>) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInvalid = (errors: any) => {
    const fieldNames = Object.keys(errors);
    const firstLabel =
      config.fields.find((f) => f.name === fieldNames[0])?.label ?? fieldNames[0];
    toast.error(
      fieldNames.length === 1
        ? `Champ requis ou invalide : ${firstLabel}`
        : `Veuillez corriger ${fieldNames.length} champs (${firstLabel}…)`,
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleValid, handleInvalid)}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"
      >
        {config.fields
          .filter((f) => f.type !== "file")
          .filter((f) => (f.showIf ? f.showIf(watchedValues) : true))
          .map((f) => (
            <div
              key={f.name}
              className={
                f.colSpan === 2 || f.type === "radio" || f.type === "checkbox"
                  ? "col-span-full"
                  : ""
              }
            >
              <RenderField field={f} control={form.control} />
            </div>
          ))}

        {config.alerts && (
          <div className="col-span-full space-y-2">
            <RenderAlerts alerts={config.alerts} values={watchedValues} />
          </div>
        )}

        <div className="col-span-full flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {submitting
              ? "Enregistrement…"
              : editingId
              ? "Modifier"
              : "Ajouter"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ═══════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════
const Etape3Actif = () => {
  const navigate = useNavigate();
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [items, setItems] = useState<ActifItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ActifItem | null>(null);
  const [activeType, setActiveType] = useState<AssetTypeKey>("compte_bancaire");
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const { status: saveStatus, track } = useSaveStatus();

  const loadItems = useCallback(async (declId: string) => {
    const { data, error } = await supabase
      .from("actif_items")
      .select("*")
      .eq("declaration_id", declId);
    if (error) {
      toast.error("Erreur de chargement : " + error.message);
      return;
    }
    if (data) setItems(data as unknown as ActifItem[]);
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

  const itemsByType = (type: string) =>
    items.filter((i) => i.type_bien === type);

  const totalBrut = items.reduce((s, i) => s + (i.valeur_estimee ?? 0), 0);

  const openAdd = (type: AssetTypeKey) => {
    setActiveType(type);
    setEditingId(null);
    setEditingItem(null);
    setDialogOpen(true);
  };

  const openEdit = (item: ActifItem) => {
    const type = item.type_bien as AssetTypeKey;
    setActiveType(type);
    setEditingId(item.id);
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: Record<string, any>) => {
    if (!declarationId) {
      toast.error("Déclaration introuvable. Recharge la page.");
      return;
    }

    const cfg = ASSET_CONFIGS[activeType];
    const valeur = Number(values[cfg.valeurField]) || 0;

    // Compute libelle: explicit libelle field if present, otherwise derive
    // from a meaningful field of the type (for compte_bancaire => label of
    // selected type_compte_precis).
    let libelle: string | null = (values.libelle as string) ?? null;
    if (!libelle && activeType === "compte_bancaire") {
      const typeField = cfg.fields.find((f) => f.name === "type_compte_precis");
      const opt = typeField?.options?.find(
        (o) => o.value === values.type_compte_precis,
      );
      libelle = opt?.label ?? null;
    }

    // Build details JSON, excluding fields that are persisted as top-level columns.
    const topLevel = new Set<string>(
      activeType === "compte_bancaire" ? COMPTE_TOP_LEVEL_FIELDS : [],
    );
    const details: Record<string, any> = {};
    for (const f of cfg.fields) {
      if (f.name === "libelle" || f.name === cfg.valeurField) continue;
      if (topLevel.has(f.name)) continue;
      const v = values[f.name];
      details[f.name] = v === "" || v === undefined ? null : v;
    }

    const payload: Record<string, any> = {
      declaration_id: declarationId,
      type_bien: activeType,
      libelle,
      valeur_estimee: valeur,
      details,
    };

    if (activeType === "compte_bancaire") {
      const indivision = values.detenu_en_indivision === true;
      payload.banque_nom = values.banque_nom || null;
      payload.banque_adresse = values.banque_adresse || null;
      payload.numero_compte = values.numero_compte || null;
      payload.type_compte_precis = values.type_compte_precis || null;
      payload.detenu_en_indivision = indivision;
      payload.quote_part_pct = indivision
        ? Number(values.quote_part_pct) || null
        : null;
    }


    let saveError: { message: string } | null = null;
    await track(async () => {
      if (editingId) {
        const { error } = await (supabase.from("actif_items") as any)
          .update(payload)
          .eq("id", editingId);
        saveError = error;
      } else {
        const { error } = await (supabase.from("actif_items") as any).insert(payload);
        saveError = error;
      }
    });

    if (saveError) {
      toast.error("Erreur lors de l'enregistrement : " + saveError.message);
      return;
    }

    toast.success(editingId ? "Élément modifié" : "Élément ajouté");
    await loadItems(declarationId);
    setOpenCategories((prev) =>
      prev.includes(activeType) ? prev : [...prev, activeType],
    );
    setDialogOpen(false);
  };

  const deleteItem = async (id: string) => {
    if (!declarationId) return;
    let delError: { message: string } | null = null;
    await track(async () => {
      const { error } = await supabase.from("actif_items").delete().eq("id", id);
      delError = error;
    });
    if (delError) {
      toast.error("Erreur de suppression : " + delError.message);
      return;
    }
    await loadItems(declarationId);
  };

  const handleContinue = async () => {
    if (!declarationId) return;
    await supabase
      .from("declarations")
      .update({ current_step: 3 })
      .eq("id", declarationId);
    navigate("/etape/4");
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <ModeIaSourcePreview />
      <SaveIndicator status={saveStatus} />
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            Étape 3 sur 6 — L'actif
          </span>
          <span className="text-sm text-muted-foreground">4 / 7</span>
        </div>
        <Progress value={(4 / 7) * 100} className="h-2" />
      </div>

      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
        Actif successoral
      </h1>
      <p className="text-muted-foreground mb-4">
        Inventoriez tous les biens du défunt, par catégorie.
      </p>

      {/* Total */}
      <Card className="mb-8 border-accent/30 bg-accent/5">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="font-medium">Actif brut saisi</span>
          <span className="font-heading text-xl font-bold">
            {formatEur(totalBrut)}
          </span>
        </CardContent>
      </Card>

      {/* Accordion sections */}
      <Accordion
        type="multiple"
        value={openCategories}
        onValueChange={setOpenCategories}
        className="space-y-2 mb-8"
      >
        {ASSET_TYPES.map(({ key, label }) => {
          const typeItems = itemsByType(key);
          const typeTotal = typeItems.reduce(
            (s, i) => s + (i.valeur_estimee ?? 0),
            0
          );
          return (
            <AccordionItem key={key} value={key} className="border rounded-lg px-1">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <span className="font-medium">{label}</span>
                  {typeItems.length > 0 && (
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                      {typeItems.length} · {formatEur(typeTotal)}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {typeItems.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {typeItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-md bg-secondary/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {item.libelle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatEur(item.valeur_estimee ?? 0)}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">
                    Aucun élément dans cette catégorie.
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAdd(key)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Ajouter
                </Button>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => navigate("/etape/2")}>
          Précédent
        </Button>
        <Button
          onClick={handleContinue}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Sauvegarder et continuer
        </Button>
      </div>

      {/* ─── Modal ─── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialogOpen(false);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingId ? "Modifier" : "Ajouter"} —{" "}
              {ASSET_TYPES.find((t) => t.key === activeType)?.label}
            </DialogTitle>
          </DialogHeader>

          {dialogOpen && (
            <AssetDialogForm
              key={`${activeType}-${editingId ?? "new"}`}
              type={activeType}
              editingId={editingId}
              initialItem={editingItem}
              onCancel={() => setDialogOpen(false)}
              onSubmit={handleSubmit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Etape3Actif;
