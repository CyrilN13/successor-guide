import { useCallback, useRef, useState } from "react";
import type { SaveStatus } from "@/components/SaveIndicator";

/**
 * Tracks an autosave lifecycle: idle → saving → saved → idle.
 * Wrap a save operation with `track()` to drive a <SaveIndicator />.
 */
export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<number | null>(null);

  const track = useCallback(async <T>(op: () => Promise<T>): Promise<T> => {
    setStatus("saving");
    try {
      const result = await op();
      setStatus("saved");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setStatus("idle"), 1500);
      return result;
    } catch (e) {
      setStatus("idle");
      throw e;
    }
  }, []);

  return { status, track };
}
