import { useState } from "react";
import type { QuoteOverrides, RecomputeInputs } from "./recompute";
import { decimalPlaces, validateFieldValue, type QuoteFieldMeta } from "./quoteFields";

// Owns the Inputs Panel's editing state (typed values, validity, whole-pack
// vs per-unit view), separate from field-definition/rendering concerns.
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
  // Which fields the user toggled to "whole-pack cost" entry -- purely a
  // display convenience; QuoteOverrides itself always stores per-unit.
  const [wholePackFields, setWholePackFields] = useState<Record<string, boolean>>({});

  const packQty = inputs.baseline.PackQty && inputs.baseline.PackQty > 0 ? inputs.baseline.PackQty : null;

  function roundTo(value: number, step: string): number {
    const factor = 10 ** decimalPlaces(step);
    return Math.round(value * factor) / factor;
  }

  // Prefer whatever the user is actively typing; otherwise fall back to
  // `overrides` directly, so a value set from outside this hook (solver
  // "Apply", loading a scenario) still shows up in the field. Scales the
  // stored per-unit value up to whole-pack terms when that toggle is on.
  function displayValue(key: string, field?: QuoteFieldMeta): string {
    if (texts[key] !== undefined) return texts[key];
    const v = (overrides as Record<string, number | undefined>)[key];
    if (v === undefined) return "";
    if (field && wholePackFields[key] && packQty) return String(roundTo(v * packQty, field.step));
    return String(v);
  }

  // When whole-pack entry is on, `text` is divided by packQty here before
  // reaching QuoteOverrides, which always stores per-unit.
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
  // is currently displayed in place, and re-derives the per-unit override
  // immediately rather than waiting for the next edit.
  function toggleWholePack(f: QuoteFieldMeta) {
    if (!packQty) return;
    const goingWholePack = !wholePackFields[f.key];
    const current = displayValue(f.key, f);
    setWholePackFields((w) => ({ ...w, [f.key]: goingWholePack }));
    if (current === "" || !Number.isFinite(Number(current))) return;
    const num = Number(current);
    const converted = roundTo(goingWholePack ? num * packQty : num / packQty, f.step);
    setTexts((t) => ({ ...t, [f.key]: String(converted) }));
    // `num` is already per-unit when going whole-pack; `converted` is
    // per-unit when leaving it. Either way QuoteOverrides gets per-unit.
    onChange({ ...overrides, [f.key]: goingWholePack ? num : converted } as QuoteOverrides);
  }

  // Steps from whatever's in the field, or the real baseline if empty --
  // never from 0 like the native browser spinner does.
  function stepValue(f: QuoteFieldMeta, base: number | null, direction: 1 | -1) {
    const isWholePack = !!(f.supportsWholePackEntry && wholePackFields[f.key] && packQty);
    const displayBase = isWholePack && base !== null ? base * packQty! : base;
    const text = displayValue(f.key, f);
    const current = text !== "" && Number.isFinite(Number(text)) ? Number(text) : (displayBase ?? 0);
    const effectiveStep = isWholePack ? Number(f.step) * packQty! : Number(f.step);
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
