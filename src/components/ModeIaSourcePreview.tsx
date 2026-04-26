import { useEffect, useState } from "react";
import { FileText, X, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mode_ia_preview_doc_id";
const DISMISS_PREFIX = "mode_ia_preview_dismissed_";

/**
 * Floating side panel showing the source document the user was redirected
 * from (failed extraction → "Saisir manuellement"). Reads the doc id from
 * sessionStorage and signs a URL from the `uploads` bucket.
 *
 * Mount it once at the top of any step page.
 */
const ModeIaSourcePreview = () => {
  const [docId, setDocId] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("Document");
  const [mime, setMime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) return;
    if (sessionStorage.getItem(DISMISS_PREFIX + id) === "1") return;
    setDocId(id);
  }, []);

  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: doc } = await supabase
        .from("uploaded_documents")
        .select("storage_path")
        .eq("id", docId)
        .maybeSingle();
      if (cancelled) return;
      if (!doc?.storage_path) {
        setLoading(false);
        return;
      }
      const name = doc.storage_path.split("/").pop()?.replace(/^[^_]+_/, "");
      if (name) setFileName(name);
      const lower = doc.storage_path.toLowerCase();
      setMime(
        lower.endsWith(".pdf")
          ? "application/pdf"
          : lower.endsWith(".png")
            ? "image/png"
            : "image/jpeg",
      );
      const { data: signed } = await supabase.storage
        .from("uploads")
        .createSignedUrl(doc.storage_path, 300);
      if (cancelled) return;
      setUrl(signed?.signedUrl ?? null);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  if (!docId || !open) return null;

  const handleDismiss = () => {
    if (docId) sessionStorage.setItem(DISMISS_PREFIX + docId, "1");
    setOpen(false);
  };

  return (
    <Card
      className={cn(
        "fixed z-40 bg-background shadow-lg border",
        "transition-all duration-200",
        // Position: bottom-right on mobile, right side on desktop
        "bottom-4 right-4 left-4 sm:left-auto",
        collapsed
          ? "sm:w-72 sm:top-auto"
          : "sm:w-[28rem] sm:top-24 sm:bottom-4",
      )}
    >
      <div className="flex items-center gap-2 p-3 border-b">
        <FileText className="w-4 h-4 text-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Document source IA
          </p>
          <p className="text-sm font-medium truncate">{fileName}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Agrandir" : "Réduire"}
        >
          {collapsed ? (
            <Maximize2 className="w-3.5 h-3.5" />
          ) : (
            <Minimize2 className="w-3.5 h-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleDismiss}
          aria-label="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {!collapsed && (
        <div className="h-[60vh] sm:h-[calc(100vh-12rem)] w-full bg-secondary/30">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
          ) : url ? (
            mime.startsWith("image/") ? (
              <img
                src={url}
                alt={fileName}
                className="w-full h-full object-contain"
              />
            ) : (
              <iframe
                src={url}
                className="w-full h-full"
                title="Document source"
              />
            )
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              Document indisponible.
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

export default ModeIaSourcePreview;
