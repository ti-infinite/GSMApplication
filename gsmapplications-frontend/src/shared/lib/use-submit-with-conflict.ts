import { useState } from "react";
import { toast } from "sonner";

// The repeated submitting/conflictError/try-catch-finally shell duplicated
// across all 6 reference cards' handleApply -- every one of them POSTs,
// treats HTTP 409 as a real "already exists, see the table below" state
// (not a toast-and-forget error), and falls back to the same network-error
// copy. Deliberately does NOT try to also own body construction, local
// validation, success copy, or which fields reset -- those differ
// genuinely per resource (commission-card's multi-select + percent/value
// dual entry has no equivalent in the other 5) and forcing them into this
// shell would make it a leaky abstraction instead of a clean one.
// REFACTOR_PLAN.md phase 02.
export function useSubmitWithConflict() {
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  async function submit(
    request: () => Promise<Response>,
    options: {
      conflictMessage: string;
      defaultErrorMessage: string;
      onSuccess: (json: Record<string, unknown>) => void;
    }
  ) {
    setSubmitting(true);
    setConflictError(null);
    try {
      const res = await request();
      const json = await res.json();
      // Next.js -> Vite conversion: `request()` now calls the relay
      // directly (relayFetch), not this app's own now-deleted Next.js
      // route -- reads the relay's real error shape ({detail}) instead of
      // the translation layer that route used to apply ({error}).
      if (res.status === 409) {
        setConflictError(json.detail);
        toast.error(options.conflictMessage);
        return;
      }
      if (!res.ok) {
        toast.error(json.detail ?? options.defaultErrorMessage);
        return;
      }
      options.onSuccess(json);
    } catch {
      toast.error("Failed to reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, conflictError, setConflictError, submit };
}
