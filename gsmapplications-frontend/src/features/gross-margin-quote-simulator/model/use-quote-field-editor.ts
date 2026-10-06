import { useState } from "react";
import type { QuoteOverrides, RecomputeInputs } from "./recompute";
import { decimalPlaces, validateFieldValue, type QuoteFieldMeta } from "./quote-fields";

// Owns the Inputs Panel's editing state -- what's typed, what's invalid,
// which fields are currently viewed whole-pack vs per-unit -- separate from
// the panel's own field-definition/rendering concerns (which price/cost
// fields exist for this mode, the Pallet Cost special case, the JSX itself).
// REFACTOR_PLAN.md phase 02: "Editing + field definitions + the Pallet Cost
// special case, tangled." The Pallet Cost block was never actually a
// separate concern from ordinary field editing -- it's just another
// consumer of this same setField/resetField/stepValue/displayValue API --
// so extracting this out is what detangles it, no special-casing needed here.
export function useQuoteFieldEditor({
  inputs,
  overrides,
  onChange,
  onTransportModeChange,
}: {
  inputs: RecomputeInputs;
  overrides: QuoteOverrides;
  onChange: (next: QuoteOverrides) => void;
  onTransportModeChange: (mode: "direct" | "pallet") => void;
}) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  // Which fields the user has toggled to "I have a whole-pack cost" entry --
  // purely a display/entry convenience. QuoteOverrides itself always stores
  // the per-unit value (see setField below); this map never leaves this hook.
  // Only meaningful for fields with supportsWholePackEntry.
  const [wholePackFields, setWholePackFields] = useState<Record<string, boolean>>({});

  const packQty = inputs.baseline.PackQty && inputs.baseline.PackQty > 0 ? inputs.baseline.PackQty : null;

  function roundTo(value: number, step: string): number {
    const factor = 10 ** decimalPlaces(step);
    return Math.round(value * factor) / factor;
  }

  // Prefer whatever the user is actively typing; otherwise fall back to
  // reflecting `overrides` directly. Without the fallback, a value set from
  // OUTSIDE this hook's own inputs -- the target-margin solver's "Apply", or
  // loading a saved scenario -- would silently fail to show up in the field
  // even though it's already affecting every number on the page, which reads
  // as "my apply/load didn't work" when it actually did. When `field`
  // supports whole-pack entry and that toggle is on, the stored (per-unit)
  // override is scaled up to whole-pack terms for display.
  function displayValue(key: string, field?: QuoteFieldMeta): string {
    if (texts[key] !== undefined) return texts[key];
    const v = (overrides as Record<string, number | undefined>)[key];
    if (v === undefined) return "";
    if (field && wholePackFields[key] && packQty) return String(roundTo(v * packQty, field.step));
    return String(v);
  }

  // `field` present + whole-pack toggle on -> `text` is in whole-pack terms
  // and gets divided by packQty before ever reaching QuoteOverrides, which
  // always stores per-unit regardless of how the user is currently viewing
  // the field. This is the one place that conversion happens.
  function setField(key: string, text: string, field?: QuoteFieldMeta) {
    setTexts((t) => ({ ...t, [key]: text }));
    if (text === "") {
      setErrors((e) => ({ ...e, [key]: null }));
      const next = { ...overrides } as Record<string, number | undefined>;
      delete next[key];
      onChange(next as QuoteOverrides);
      return;
    }
    const value = Number(text);
    if (!Number.isFinite(value)) return;
    const err = validateFieldValue(key, value);
    setErrors((e) => ({ ...e, [key]: err }));
    if (err) return;
    const perUnitValue = field && wholePackFields[key] && packQty ? value / packQty : value;
    onChange({ ...overrides, [key]: perUnitValue } as QuoteOverrides);
  }

  function resetField(key: string) {
    setTexts((t) => ({ ...t, [key]: "" }));
    setErrors((e) => ({ ...e, [key]: null }));
    setWholePackFields((w) => ({ ...w, [key]: false }));
    const next = { ...overrides } as Record<string, number | undefined>;
    delete next[key];
    onChange(next as QuoteOverrides);
  }

  function resetAll() {
    setTexts({});
    setErrors({});
    setWholePackFields({});
    onTransportModeChange("direct");
    onChange({});
  }

  // Flips a field between per-unit and whole-pack entry, converting whatever
  // is currently displayed (typed or from overrides) in place so nothing is
  // lost -- and re-derives the per-unit override to match the new reading,
  // since setField's own conversion only fires on the NEXT edit otherwise.
  function toggleWholePack(f: QuoteFieldMeta) {
    if (!packQty) return;
    const goingWholePack = !wholePackFields[f.key];
    const current = displayValue(f.key, f);
    setWholePackFields((w) => ({ ...w, [f.key]: goingWholePack }));
    if (current === "" || !Number.isFinite(Number(current))) return;
    const num = Number(current);
    const converted = roundTo(goingWholePack ? num * packQty : num / packQty, f.step);
    setTexts((t) => ({ ...t, [f.key]: String(converted) }));
    // `num` (read via the OLD wholePackFields state above) is already
    // per-unit when we were per-unit and are now going whole-pack; when
    // leaving whole-pack mode, `converted` (num / packQty) is the per-unit
    // value. Either way QuoteOverrides ends up holding per-unit.
    onChange({ ...overrides, [f.key]: goingWholePack ? num : converted } as QuoteOverrides);
  }

  // Steps from whatever's already in the field, or the real baseline if it's
  // still empty -- never from 0, which is what the native browser spinner
  // does on an empty input and is exactly the bug this replaces. Steps in
  // whichever unit (per-unit or whole-pack) is currently displayed.
  function stepValue(f: QuoteFieldMeta, base: number | null, direction: 1 | -1) {
    const wholePack = !!(f.supportsWholePackEntry && wholePackFields[f.key] && packQty);
    const displayBase = wholePack && base !== null ? base * packQty! : base;
    const text = displayValue(f.key, f);
    const current = text !== "" && Number.isFinite(Number(text)) ? Number(text) : (displayBase ?? 0);
    const effectiveStep = wholePack ? Number(f.step) * packQty! : Number(f.step);
    const next = roundTo(current + direction * effectiveStep, f.step);
    setField(f.key, String(next), f);
  }

  return {
    packQty,
    errors,
    wholePackFields,
    displayValue,
    setField,
    resetField,
    resetAll,
    toggleWholePack,
    stepValue,
  };
}
