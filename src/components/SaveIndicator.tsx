import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved";

interface SaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

/**
 * Discrete autosave indicator — top-right corner of each step.
 */
export const SaveIndicator = ({ status, className }: SaveIndicatorProps) => {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "fixed top-20 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border bg-background/95 backdrop-blur transition-opacity",
        status === "saving"
          ? "text-muted-foreground border-muted"
          : "text-accent border-accent/30",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {status === "saving" ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Sauvegarde en cours…</span>
        </>
      ) : (
        <>
          <Check className="h-3 w-3" />
          <span>Sauvegardé</span>
        </>
      )}
    </div>
  );
};
