import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import { validateNumberFields, type NumberRule, type ValidationError } from "./formValidation";

/** Translate a validation error code (grossMargin.validation.*). */
export function validationMessage(t: TFunction, err: ValidationError): string {
  return t(`grossMargin.validation.${err.code}`, err.params ?? {});
}

/**
 * Form-level validation state for a set of numeric text inputs plus any
 * extra (text / selection / cross-field) errors the form computes itself.
 *
 * - `errors` is always complete; `visibleErrors` only shows an error once its
 *   field was touched (blur) or a submit was attempted, so a fresh form
 *   doesn't open covered in red.
 * - `attemptSubmit()` marks everything touched, toasts when invalid, and
 *   returns whether the form may be submitted.
 */
export function useFieldValidation<K extends string>(
  texts: Record<K, string>,
  specs: Record<K, NumberRule[]>,
  extraErrors?: Partial<Record<string, ValidationError | null | undefined>>
) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);

  const numeric = useMemo(() => validateNumberFields(texts, specs), [texts, specs]);

  const errors = useMemo(() => {
    const all: Record<string, ValidationError> = { ...(numeric.errors as Record<string, ValidationError>) };
    if (extraErrors) {
      for (const [key, err] of Object.entries(extraErrors)) {
        if (err) all[key] = err;
      }
    }
    return all;
  }, [numeric.errors, extraErrors]);

  const isValid = Object.keys(errors).length === 0;

  const visibleErrors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [key, err] of Object.entries(errors)) {
      if (attempted || touched[key]) out[key] = validationMessage(t, err);
    }
    return out;
  }, [errors, attempted, touched, t]);

  const touch = useCallback((key: string) => {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  }, []);

  const attemptSubmit = useCallback(() => {
    setAttempted(true);
    if (!isValid) toast.error(t("grossMargin.validation.incomplete"));
    return isValid;
  }, [isValid, t]);

  const reset = useCallback(() => {
    setTouched({});
    setAttempted(false);
  }, []);

  return { errors, visibleErrors, values: numeric.values, isValid, touch, attemptSubmit, reset };
}
