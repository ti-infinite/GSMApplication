import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Combobox } from "@/shared/ui/combobox";
import { SKU_CLASSES, SKU_TYPES, type CodeOption } from "../model/skuVocabulary";
import { SKU_NOT_LISTED } from "../model/useSkuBuilder";
import { cn } from "@/shared/lib/utils";

// Paired view for use-sku-builder.ts -- the collapsible "Know this product's
// SKU code already?" section inside the save-reference banner.
export function QuoteSimulatorSkuBuilder({
  isExpanded,
  onToggleExpanded,
  skuClass,
  onSkuClassChange,
  skuType,
  onSkuTypeChange,
  selectedHerbCode,
  onSelectedHerbCodeChange,
  customHerbCode,
  onCustomHerbCodeChange,
  herbCodes,
  usingCustomHerb,
  herbCodeValid,
  builtSku,
}: {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  skuClass: string;
  onSkuClassChange: (value: string) => void;
  skuType: string;
  onSkuTypeChange: (value: string) => void;
  selectedHerbCode: string;
  onSelectedHerbCodeChange: (value: string) => void;
  customHerbCode: string;
  onCustomHerbCodeChange: (value: string) => void;
  herbCodes: CodeOption[];
  usingCustomHerb: boolean;
  herbCodeValid: boolean;
  builtSku: string | null;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        Know this product&apos;s SKU code already?
      </button>
      {isExpanded && (
        <div className="space-y-2 rounded-lg border border-dashed border-input p-3">
          <p className="text-xs text-muted-foreground">
            Only matters if this variety isn&apos;t registered in NHUBEX yet — otherwise the real
            code is found automatically. Not verified against NHUBEX; only set this if you&apos;re
            confident it&apos;s right.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Class</label>
              <Combobox
                value={skuClass}
                onChange={(v) => v && onSkuClassChange(v)}
                options={SKU_CLASSES.map((c) => ({ value: c.code, label: `${c.label} (${c.code})` }))}
                placeholder="Select a class…"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Combobox
                value={skuType}
                onChange={(v) => v && onSkuTypeChange(v)}
                options={SKU_TYPES.map((t) => ({ value: t.code, label: `${t.label} (${t.code})` }))}
                placeholder="Select a type…"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Herb</label>
              <Combobox
                value={selectedHerbCode}
                onChange={(v) => v && onSelectedHerbCodeChange(v)}
                options={[
                  ...herbCodes.map((h) => ({ value: h.code, label: `${h.label} (${h.code})` })),
                  { value: SKU_NOT_LISTED, label: "Not listed — type a new code" },
                ]}
                placeholder="Select a herb…"
              />
            </div>
          </div>
          {usingCustomHerb && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">New 4-letter herb code</label>
              <Input
                placeholder="e.g. BASI"
                value={customHerbCode}
                maxLength={4}
                onChange={(e) => onCustomHerbCodeChange(e.target.value.toUpperCase())}
                className={cn("w-32 uppercase", customHerbCode.length > 0 && !herbCodeValid && "border-destructive")}
              />
            </div>
          )}
          {builtSku ? (
            <p className="text-xs text-muted-foreground">
              Will save as <span className="font-mono font-semibold text-foreground">{builtSku}</span>
            </p>
          ) : (
            selectedHerbCode !== "" && <p className="text-xs text-destructive">A herb code is exactly 4 letters.</p>
          )}
        </div>
      )}
    </>
  );
}
