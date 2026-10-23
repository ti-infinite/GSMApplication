// Pure form-validation helpers (no React, no i18n) shared by every Gross
// Margin form: the Updates cards, the log-table edit popovers and the Quote
// Simulator inputs. Rules are data so the same list can drive a card's
// "Add" form and its table's inline edit.

export type NumberRule =
  | { kind: "required" }
  | { kind: "positive" } // > 0
  | { kind: "nonNegative" } // >= 0
  | { kind: "integer" }
  | { kind: "max"; value: number; inclusive?: boolean } // default inclusive
  | { kind: "min"; value: number; inclusive?: boolean };

export type ValidationCode =
  | "required"
  | "notANumber"
  | "mustBePositive"
  | "mustBeNonNegative"
  | "mustBeInteger"
  | "max"
  | "maxExclusive"
  | "min"
  | "minExclusive"
  | "mustDiffer"
  | "atLeastOneValue";

export interface ValidationError {
  code: ValidationCode;
  params?: Record<string, string | number>;
}

export const INVALID = Symbol("invalid");
export type ParsedDecimal = number | null | typeof INVALID;

/**
 * Lenient decimal parser for typed input.
 *   ""            -> null (blank)
 *   "1,5"         -> 1.5
 *   "1 500,25"    -> 1500.25
 *   "1,500.25"    -> 1500.25
 *   "abc" / "1.2.3" -> INVALID
 * When both "," and "." appear, the LAST one is the decimal separator and
 * every other separator is a thousands mark. With only one kind present it
 * is the decimal separator.
 */
export function parseDecimal(text: string): ParsedDecimal {
  const raw = text.replace(/\s/g, "");
  if (raw === "") return null;
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalised: string;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandsSep = decimalSep === "," ? "." : ",";
    normalised = raw.split(thousandsSep).join("").replace(decimalSep, ".");
  } else if (lastComma >= 0) {
    if (raw.indexOf(",") !== lastComma) return INVALID; // "1,5,5"
    normalised = raw.replace(",", ".");
  } else {
    if (lastDot >= 0 && raw.indexOf(".") !== lastDot) return INVALID; // "1.2.3"
    normalised = raw;
  }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(normalised)) return INVALID;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : INVALID;
}

export function validateNumber(text: string, rules: NumberRule[]): ValidationError | null {
  const parsed = parseDecimal(text);
  if (parsed === INVALID) return { code: "notANumber" };
  if (parsed === null) {
    return rules.some((r) => r.kind === "required") ? { code: "required" } : null;
  }
  for (const rule of rules) {
    switch (rule.kind) {
      case "positive":
        if (parsed <= 0) return { code: "mustBePositive" };
        break;
      case "nonNegative":
        if (parsed < 0) return { code: "mustBeNonNegative" };
        break;
      case "integer":
        if (!Number.isInteger(parsed)) return { code: "mustBeInteger" };
        break;
      case "max": {
        const inclusive = rule.inclusive ?? true;
        if (inclusive ? parsed > rule.value : parsed >= rule.value) {
          return { code: inclusive ? "max" : "maxExclusive", params: { max: rule.value } };
        }
        break;
      }
      case "min": {
        const inclusive = rule.inclusive ?? true;
        if (inclusive ? parsed < rule.value : parsed <= rule.value) {
          return { code: inclusive ? "min" : "minExclusive", params: { min: rule.value } };
        }
        break;
      }
      case "required":
        break;
    }
  }
  return null;
}

export function validateRequiredText(text: string): ValidationError | null {
  return text.trim() === "" ? { code: "required" } : null;
}

/** Two selections that must not be the same value (e.g. blend vs. component). */
export function validateDistinct(a: string, b: string, otherLabel: string): ValidationError | null {
  return a !== "" && b !== "" && a === b ? { code: "mustDiffer", params: { other: otherLabel } } : null;
}

export interface NumberFieldsResult<K extends string> {
  errors: Partial<Record<K, ValidationError>>;
  /** Parsed values; null for a blank optional field. Only meaningful when isValid. */
  values: Record<K, number | null>;
  isValid: boolean;
}

export function validateNumberFields<K extends string>(
  texts: Record<K, string>,
  specs: Record<K, NumberRule[]>
): NumberFieldsResult<K> {
  const errors: Partial<Record<K, ValidationError>> = {};
  const values = {} as Record<K, number | null>;
  for (const key of Object.keys(specs) as K[]) {
    const text = texts[key] ?? "";
    const err = validateNumber(text, specs[key]);
    if (err) errors[key] = err;
    const parsed = parseDecimal(text);
    values[key] = typeof parsed === "number" ? parsed : null;
  }
  return { errors, values, isValid: Object.keys(errors).length === 0 };
}

/** True when at least one of the given parsed values is present. */
export function hasAnyValue(values: Record<string, number | null>, keys: readonly string[]): boolean {
  return keys.some((k) => values[k] !== null && values[k] !== undefined);
}

/**
 * Props to spread on every numeric <Input>. Plain text with a decimal
 * keyboard: letters and comma decimals stay visible and get validated,
 * instead of being silently dropped by type="number".
 */
export const decimalInputProps = {
  type: "text",
  inputMode: "decimal",
  autoComplete: "off",
} as const;
