import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
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
  herbSearch,
  onHerbSearchChange,
  selectedHerbCode,
  onSelectedHerbCodeChange,
  customHerbCode,
  onCustomHerbCodeChange,
  filteredHerbCodes,
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
  herbSearch: string;
  onHerbSearchChange: (value: string) => void;
  selectedHerbCode: string;
  onSelectedHerbCodeChange: (value: string) => void;
  customHerbCode: string;
  onCustomHerbCodeChange: (value: string) => void;
  filteredHerbCodes: CodeOption[];
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
              <Select value={skuClass} onValueChange={(v) => v && onSkuClassChange(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKU_CLASSES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={skuType} onValueChange={(v) => v && onSkuTypeChange(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKU_TYPES.map((t) => (
                    <SelectItem key={t.code} value={t.code}>
                      {t.label} ({t.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Herb</label>
              <Input
                placeholder="Search…"
                value={herbSearch}
                onChange={(e) => onHerbSearchChange(e.target.value)}
                className="mb-1"
              />
              <Select value={selectedHerbCode} onValueChange={(v) => v && onSelectedHerbCodeChange(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {filteredHerbCodes.map((h) => (
                    <SelectItem key={h.code} value={h.code}>
                      {h.label} ({h.code})
                    </SelectItem>
                  ))}
                  <SelectItem value={SKU_NOT_LISTED}>Not listed — type a new code</SelectItem>
                </SelectContent>
              </Select>
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
