import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  Image as ImageIcon,
  Trash2,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  UploadCloud,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { applyExtractionToDeclaration } from "@/lib/mapping";
import ModeIaSecurityNotice from "@/components/ModeIaSecurityNotice";

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "acte_deces", label: "Acte de décès" },
  { value: "releve_bancaire", label: "Relevé bancaire" },
  { value: "titre_propriete", label: "Titre de propriété" },
  { value: "assurance_vie", label: "Contrat d'assurance-vie" },
  { value: "acte_donation", label: "Acte de donation" },
  { value: "justificatif_dette", label: "Justificatif de dette" },
  { value: "livret_famille", label: "Livret de famille" },
  { value: "releve_portefeuille", label: "Relevé de portefeuille / courtier" },
  { value: "autre", label: "Autre (détection auto)" },
];

const MAX_FILES = 20;
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo
const ACCEPTED = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

type DocStatus = "pending" | "processing" | "done" | "failed";

interface DocRow {
  id: string;
  storage_path: string | null;
  doc_type: string | null;
  detected_type: string | null;
  extraction_status: DocStatus;
  uploaded_at: string | null;
  // local-only
  fileName?: string;
  mimeType?: string;
  thumbnailUrl?: string;
}

const StatusBadge = ({ status }: { status: DocStatus }) => {
  const map = {
    pending: {
      label: "En attente",
      icon: Clock,
      className: "bg-secondary text-secondary-foreground",
    },
    processing: {
      label: "En cours",
      icon: Loader2,
      className: "bg-accent/20 text-accent-foreground",
      spin: true,
    },
    done: {
      label: "Extrait",
      icon: CheckCircle2,
      className: "bg-primary text-primary-foreground",
    },
    failed: {
      label: "Échec",
      icon: XCircle,
      className: "bg-destructive text-destructive-foreground",
    },
  } as const;
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <Badge className={cn("gap-1.5 font-normal", cfg.className)}>
      <Icon className={cn("w-3 h-3", "spin" in cfg && cfg.spin && "animate-spin")} />
      {cfg.label}
    </Badge>
  );
};

const ModeIaUpload = () => {
  const navigate = useNavigate();
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Récupère/initialise la déclaration anonyme
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("deesse_token");
      if (!token) {
        navigate("/choix-mode");
        return;
      }
      const { data, error } = await supabase
        .from("declarations")
        .select("id, mode")
        .eq("anonymous_token", token)
        .maybeSingle();

      if (error || !data) {
        navigate("/choix-mode");
        return;
      }
      setDeclarationId(data.id);

      const { data: existing } = await supabase
        .from("uploaded_documents")
        .select("*")
        .eq("declaration_id", data.id)
        .is("deleted_at", null)
        .order("uploaded_at", { ascending: true });

      if (existing) {
        setDocs(
          existing.map((d) => ({
            id: d.id,
            storage_path: d.storage_path,
            doc_type: d.doc_type,
            detected_type: d.detected_type,
            extraction_status: (d.extraction_status as DocStatus) || "pending",
            uploaded_at: d.uploaded_at,
            fileName: d.storage_path?.split("/").pop()?.replace(/^[^_]+_/, ""),
          })),
        );
      }
    };
    init();
  }, [navigate]);

  const onDrop = useCallback(
    async (accepted: File[], rejections: any[]) => {
      if (!declarationId) return;

      if (rejections.length) {
        toast({
          title: "Fichier refusé",
          description:
            "Formats acceptés : PDF, PNG, JPG. Taille max 10 Mo par fichier.",
          variant: "destructive",
        });
      }

      if (docs.length + accepted.length > MAX_FILES) {
        toast({
          title: "Limite atteinte",
          description: `Vous ne pouvez déposer que ${MAX_FILES} fichiers maximum.`,
          variant: "destructive",
        });
        return;
      }

      for (const file of accepted) {
        const docType = "autre";
        const uuid = crypto.randomUUID();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${declarationId}/${docType}/${uuid}_${safeName}`;

        const { error: upErr } = await supabase.storage
          .from("uploads")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (upErr) {
          toast({
            title: "Échec de l'upload",
            description: upErr.message,
            variant: "destructive",
          });
          continue;
        }

        const { data: inserted, error: insErr } = await supabase
          .from("uploaded_documents")
          .insert({
            declaration_id: declarationId,
            storage_path: path,
            doc_type: docType,
            extraction_status: "pending",
          })
          .select()
          .single();

        if (insErr || !inserted) {
          toast({
            title: "Erreur d'enregistrement",
            description: insErr?.message ?? "Impossible d'enregistrer le document.",
            variant: "destructive",
          });
          await supabase.storage.from("uploads").remove([path]);
          continue;
        }

        const thumb =
          file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;

        setDocs((prev) => [
          ...prev,
          {
            id: inserted.id,
            storage_path: path,
            doc_type: docType,
            detected_type: null,
            extraction_status: "pending",
            uploaded_at: inserted.uploaded_at,
            fileName: file.name,
            mimeType: file.type,
            thumbnailUrl: thumb,
          },
        ]);
      }
    },
    [declarationId, docs.length],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: MAX_SIZE,
    multiple: true,
    disabled: !declarationId,
  });

  const handleTypeChange = async (id: string, value: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, doc_type: value } : d)),
    );
    const { error } = await supabase
      .from("uploaded_documents")
      .update({ doc_type: value })
      .eq("id", id);
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le type.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (doc: DocRow) => {
    const { error } = await supabase
      .from("uploaded_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", doc.id);
    if (error) {
      toast({
        title: "Erreur",
        description: "Suppression impossible.",
        variant: "destructive",
      });
      return;
    }
    if (doc.storage_path) {
      await supabase.storage.from("uploads").remove([doc.storage_path]);
    }
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const handleAnalyzeAll = async () => {
    const pending = docs.filter((d) => d.extraction_status === "pending");
    if (!pending.length) {
      toast({
        title: "Rien à analyser",
        description: "Aucun document en attente.",
      });
      return;
    }
    setIsAnalyzing(true);

    // Marque tous en "processing" (UI immédiat)
    const ids = pending.map((d) => d.id);
    setDocs((prev) =>
      prev.map((d) =>
        ids.includes(d.id) ? { ...d, extraction_status: "processing" } : d,
      ),
    );

    let successCount = 0;
    let failCount = 0;

    for (const doc of pending) {
      try {
        const { data, error } = await supabase.functions.invoke(
          "extract-document",
          { body: { uploadedDocumentId: doc.id } },
        );
        if (error) throw error;
        if (data && (data as any).error) throw new Error((data as any).error);

        // Re-fetch the document to get the extraction_payload + final type
        const { data: refreshed } = await supabase
          .from("uploaded_documents")
          .select("id, doc_type, detected_type, extraction_payload")
          .eq("id", doc.id)
          .maybeSingle();

        if (refreshed && declarationId) {
          try {
            await applyExtractionToDeclaration(declarationId, {
              id: refreshed.id,
              doc_type: refreshed.doc_type ?? refreshed.detected_type ?? "autre",
              extraction_payload: refreshed.extraction_payload,
            });
          } catch (mapErr) {
            console.error("Mapping failed for", doc.id, mapErr);
          }
        }

        successCount++;
        setDocs((prev) =>
          prev.map((d) =>
            d.id === doc.id ? { ...d, extraction_status: "done" } : d,
          ),
        );
      } catch (err: any) {
        failCount++;
        console.error("Extraction failed for", doc.id, err);
        setDocs((prev) =>
          prev.map((d) =>
            d.id === doc.id ? { ...d, extraction_status: "failed" } : d,
          ),
        );
        toast({
          title: `Échec : ${doc.fileName ?? "document"}`,
          description: err?.message ?? "Erreur lors de l'extraction.",
          variant: "destructive",
        });
      }
    }

    setIsAnalyzing(false);

    if (successCount > 0) {
      toast({
        title: "Analyse terminée",
        description: `${successCount} document(s) extrait(s)${failCount ? `, ${failCount} échec(s)` : ""}.`,
      });
      navigate("/mode-ia/revision");
    } else {
      toast({
        title: "Aucune extraction réussie",
        description: "Vérifiez vos documents et réessayez.",
        variant: "destructive",
      });
    }
  };

  const hasDocs = docs.length > 0;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-accent" />
        <span className="text-sm uppercase tracking-wider text-muted-foreground">
          Mode IA
        </span>
      </div>
      <h1 className="font-heading text-3xl md:text-4xl font-bold mb-3">
        Déposez vos documents
      </h1>
      <p className="text-muted-foreground mb-6">
        Notre IA pré-remplit votre déclaration à partir de vos justificatifs.
      </p>

      {/* Rappel sécurité (B6.4) */}
      <ModeIaSecurityNotice />

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-accent bg-accent/10"
            : "border-border hover:border-accent/60 hover:bg-secondary/40",
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-10 h-10 mx-auto mb-3 text-accent" />
        <p className="font-medium mb-1">
          {isDragActive
            ? "Déposez les fichiers ici…"
            : "Glissez vos fichiers ici, ou cliquez pour parcourir"}
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, PNG, JPG — 10 Mo max par fichier — 20 fichiers max
        </p>
      </div>

      {/* Liste */}
      {hasDocs && (
        <div className="mt-8 space-y-3">
          <h2 className="font-heading text-lg font-semibold">
            Documents déposés ({docs.length}/{MAX_FILES})
          </h2>
          {docs.map((doc) => {
            const isPdf =
              doc.mimeType === "application/pdf" ||
              doc.fileName?.toLowerCase().endsWith(".pdf");
            return (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                    {doc.thumbnailUrl ? (
                      <img
                        src={doc.thumbnailUrl}
                        alt={doc.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : isPdf ? (
                      <FileText className="w-6 h-6 text-accent" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-accent" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">
                      {doc.fileName ?? "Document"}
                    </p>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <Select
                        value={doc.doc_type ?? "autre"}
                        onValueChange={(v) => handleTypeChange(doc.id, v)}
                        disabled={doc.extraction_status === "processing"}
                      >
                        <SelectTrigger className="h-8 w-[230px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOC_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <StatusBadge status={doc.extraction_status} />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc)}
                    disabled={doc.extraction_status === "processing"}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <Button
          variant="ghost"
          onClick={() => navigate("/diagnostic")}
          className="sm:w-auto"
        >
          Passer à la saisie manuelle
        </Button>

        <Button
          onClick={handleAnalyzeAll}
          disabled={
            !hasDocs ||
            isAnalyzing ||
            !docs.some((d) => d.extraction_status === "pending")
          }
          className="sm:w-auto"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyse en cours…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Tout analyser
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ModeIaUpload;
