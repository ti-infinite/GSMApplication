import { useState } from "react";
import { useTranslation } from "react-i18next";
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
export function useSubmitWithConflict() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  async function submit(
    request: () => Promise<Response>,
    options: {
      conflictMessage: string;
      defaultErrorMessage: string;
      onSuccess: (json: Record<string, unknown>) => void;
    }
  ) {
    setIsSubmitting(true);
    setConflictError(null);
    try {
      const res = await request();
      const json = await res.json();
      // Reads the relay's real error shape ({detail}), not a translation
      // layer -- request() calls the relay directly (relayFetch).
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
      toast.error(t("grossMargin.common.serverUnreachable"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, conflictError, setConflictError, submit };
}
