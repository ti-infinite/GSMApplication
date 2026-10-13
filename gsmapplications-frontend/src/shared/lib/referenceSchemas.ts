// Single source of truth for the 7 reference-table Excel templates/uploads
// (see shared/ui/reference-bulk-upload.tsx, shared/lib/excel-parse.ts).
// Pure and isomorphic -- no relay/fetch import, no entity import either --
// since this same metadata drives both the browser-side upload-parsing
// code AND the preview table's column labels.
//
// REFACTOR_PLAN.md phase 06 (develop/develop2 reconciliation): this used to
// be split as one schema object per entity, living alongside that entity's
// own BulkUpsertAdapter in entities/<name>/api/bulk.ts, then consolidated
// (still in TypeScript) into features/bulk-upload-reference-data/. The
// Next.js -> Vite conversion moved that adapter half again -- this time to
// Python, as gross-margin-relay/bulk_export.py's bulk_preview/bulk_commit
// endpoints, since it's the one piece that genuinely needs live Sales data
// and there's no server of this app's own left to run it. This file never
// needed to move either time: it's pure structural metadata, consumed
// identically by the browser before that change and after it.
//
// parseRow() here only does STRUCTURAL validation (required fields present,
// values parse as the declared type, static enums like Transport's Type/
// Packaging match). It deliberately does NOT check a value against LIVE
// data (e.g. "is this a real Variety/Warehouse/Customer we actually sell")
// -- this module has no access to SalesRow data and never will, by design.
// That semantic layer lives entirely in the relay now, which runs with
// real Sales data in hand.

import { cellToText, cellToNumber } from "./cellParse";

export type ColumnType = "string" | "number" | "enum";

export interface SchemaColumn {
  key: string;
  header: string;
  type: ColumnType;
  required: boolean;
  example: string | number;
  enumOptions?: readonly string[];
  // Percent columns are entered as a whole number (e.g. 10 for 10%) and
  // divided by 100 before being sent to the relay, matching every existing
  // card's own manual-entry convention (commission-card.tsx).
  isPercent?: boolean;
}

export interface ParsedRow {
  // The validated, relay-ready body -- shape matches the corresponding
  // *Api.create() call in each entity's own api/. Loosely typed here (data
  // originates from an uploaded spreadsheet, not a TS call site) -- each
  // bulk route narrows it to the exact create-body type it already knows
  // it needs.
  data: Record<string, unknown> | null;
  errors: string[];
}

export interface ReferenceTableSchema {
  resourceId: string;
  sheetName: string;
  label: string;
  description: string;
  columns: SchemaColumn[];
  // Which columns[].key values form the natural/unique key -- drives
  // create-vs-update matching in features/bulk-upload-reference-data's
  // bulk-upsert engine. Empty for Rebate (see upsertOnly below -- it has
  // no natural-key conflict at all).
  naturalKeyColumns: string[];
  // Rebate only: every customer implicitly has a $0 rebate already, so
  // there's no create/update branch, just always-upsert. Drives both the
  // bulk-upsert engine's execution path and the preview UI's rendering
  // (old -> new value column + "Set" label instead of a create/update badge).
  upsertOnly?: boolean;
  exampleRow: Record<string, string | number>;
  parseRow(cells: Record<string, unknown>): ParsedRow;
}

const COMMISSION_TYPE_OPTIONS = ["percent", "value"] as const;

// REWRITE (2026-10-08): Commission moved from db_ai.CustomerCommission to
// db_ms.Clients/ClientAttributes -- same mechanism as Rebate (see
// rebateSchema below), applies per Customer only now, never per Variety.
// upsertOnly: true for the same reason as Rebate -- there's no natural-key
// conflict to detect, every upload always sets/replaces the customer's row.
export const commissionSchema: ReferenceTableSchema = {
  resourceId: "commission",
  sheetName: "Commission",
  label: "Commission",
  description:
    "A percentage or flat dollar amount subtracted from Avg Unit Sale Price, per customer. Commission Type is exactly \"percent\" or \"value\". Uploading always sets/replaces the value for that customer -- there's no separate create step.",
  naturalKeyColumns: [],
  upsertOnly: true,
  columns: [
    { key: "customer", header: "Customer", type: "string", required: true, example: "WAL-MART ARCADIA" },
    { key: "commissionType", header: "Commission Type", type: "enum", required: true, example: "percent", enumOptions: COMMISSION_TYPE_OPTIONS },
    { key: "commissionAmount", header: "Commission Amount (percent as 10 = 10%, value as a plain dollar number)", type: "number", required: true, example: 10 },
  ],
  exampleRow: {
    Customer: "WAL-MART ARCADIA",
    "Commission Type": "percent",
    "Commission Amount (percent as 10 = 10%, value as a plain dollar number)": 10,
  },
  parseRow(cells) {
    const errors: string[] = [];
    const customer = cellToText(cells["Customer"]);
    const commissionType = cellToText(cells["Commission Type"]).toLowerCase();
    const amountRaw = cellToNumber(cells["Commission Amount (percent as 10 = 10%, value as a plain dollar number)"]);

    if (!customer) errors.push("Customer is required.");
    if (commissionType !== "percent" && commissionType !== "value") {
      errors.push('Commission Type must be exactly "percent" or "value".');
    }
    if (amountRaw === null || Number.isNaN(amountRaw)) {
      errors.push("Commission Amount is required and must be a number.");
    } else if (amountRaw < 0) {
      errors.push("Commission Amount must be 0 or more.");
    }

    if (errors.length > 0) return { data: null, errors };
    const commissionAmount = commissionType === "percent" ? (amountRaw as number) / 100 : (amountRaw as number);
    return { data: { customer, commissionType, commissionAmount }, errors: [] };
  },
};

export const yieldsSchema: ReferenceTableSchema = {
  resourceId: "yields",
  sheetName: "Yields",
  label: "Yields",
  description: "Pound-to-unit conversion factor per Variety -- must be greater than 0.",
  naturalKeyColumns: ["variety"],
  columns: [
    { key: "variety", header: "Variety", type: "string", required: true, example: "MARJORAM - CLAMSHELL 0.5 OZ 6 PK Conventional" },
    { key: "yieldValue", header: "Yield", type: "number", required: true, example: 12 },
  ],
  exampleRow: { Variety: "MARJORAM - CLAMSHELL 0.5 OZ 6 PK Conventional", Yield: 12 },
  parseRow(cells) {
    const errors: string[] = [];
    const variety = cellToText(cells["Variety"]);
    const yieldValue = cellToNumber(cells["Yield"]);

    if (!variety) errors.push("Variety is required.");
    if (yieldValue === null || Number.isNaN(yieldValue)) errors.push("Yield is required and must be a number.");
    else if (yieldValue <= 0) errors.push("Yield must be greater than 0.");

    if (errors.length > 0) return { data: null, errors };
    return { data: { variety, yieldValue }, errors: [] };
  },
};

export const costReferenceSchema: ReferenceTableSchema = {
  resourceId: "cost-reference",
  sheetName: "Cost Reference",
  label: "Cost Reference",
  description:
    "Packing/Sticker/Box/Labour costs per Variety + Warehouse. Leave a cost column blank for \"not applicable\" -- never enter 0 to mean unknown.",
  naturalKeyColumns: ["variety", "warehouse"],
  columns: [
    { key: "variety", header: "Variety", type: "string", required: true, example: "BASIL - CLAMSHELL 0.5 OZ 6 PK Conventional" },
    { key: "warehouse", header: "Warehouse", type: "string", required: true, example: "MIA" },
    { key: "packing", header: "Packing", type: "number", required: false, example: "" },
    { key: "sticker", header: "Sticker", type: "number", required: false, example: "" },
    { key: "box", header: "Box", type: "number", required: false, example: "" },
    { key: "labourProd", header: "Labour (Prod)", type: "number", required: false, example: "" },
    { key: "labourRepack", header: "Labour (Repack)", type: "number", required: false, example: "" },
    { key: "labourAssembler", header: "Labour (Assembler)", type: "number", required: false, example: "" },
  ],
  exampleRow: {
    Variety: "BASIL - CLAMSHELL 0.5 OZ 6 PK Conventional",
    Warehouse: "MIA",
    Packing: 0.05,
    Sticker: 0.02,
    Box: 0.1,
    "Labour (Prod)": "",
    "Labour (Repack)": "",
    "Labour (Assembler)": 0.03,
  },
  parseRow(cells) {
    const errors: string[] = [];
    const variety = cellToText(cells["Variety"]);
    const warehouse = cellToText(cells["Warehouse"]).toUpperCase();
    if (!variety) errors.push("Variety is required.");
    if (!warehouse) errors.push("Warehouse is required.");

    const data: Record<string, unknown> = { variety, warehouse };
    for (const key of ["packing", "sticker", "box", "labourProd", "labourRepack", "labourAssembler"] as const) {
      const header = costReferenceSchema.columns.find((c) => c.key === key)!.header;
      const n = cellToNumber(cells[header]);
      if (n !== null) {
        if (Number.isNaN(n)) errors.push(`${header} must be a number, or left blank.`);
        else data[key] = n;
      }
    }

    if (errors.length > 0) return { data: null, errors };
    return { data, errors: [] };
  },
};

export const extraCostSchema: ReferenceTableSchema = {
  resourceId: "extra-cost",
  sheetName: "Supplier Extra Cost",
  label: "Supplier Extra Cost",
  description:
    "Per-supplier, per-SKU landed cost adjustment by warehouse. Supplier is free text (no live list to validate against) -- must exactly match the purchasing-side supplier name.",
  naturalKeyColumns: ["supplier", "skuCalculated", "measureUnit"],
  columns: [
    { key: "supplier", header: "Supplier", type: "string", required: true, example: "AGROAROMAS" },
    { key: "skuCalculated", header: "SKU", type: "string", required: true, example: "CRBASI" },
    { key: "measureUnit", header: "Package Size", type: "number", required: true, example: 16 },
    { key: "mia", header: "MIA", type: "number", required: false, example: "" },
    { key: "bos", header: "BOS", type: "number", required: false, example: "" },
    { key: "chi", header: "CHI", type: "number", required: false, example: "" },
    { key: "vin", header: "VIN", type: "number", required: false, example: "" },
  ],
  exampleRow: {
    Supplier: "AGROAROMAS",
    SKU: "CRBASI",
    "Package Size": 16,
    MIA: 0.05,
    BOS: "",
    CHI: "",
    VIN: "",
  },
  parseRow(cells) {
    const errors: string[] = [];
    const supplier = cellToText(cells["Supplier"]);
    const skuCalculated = cellToText(cells["SKU"]).toUpperCase();
    const measureUnit = cellToNumber(cells["Package Size"]);

    if (!supplier) errors.push("Supplier is required.");
    if (!skuCalculated) errors.push("SKU is required.");
    if (measureUnit === null || Number.isNaN(measureUnit)) errors.push("Package Size is required and must be a number.");
    else if (measureUnit <= 0) errors.push("Package Size must be greater than 0.");

    const data: Record<string, unknown> = { supplier, skuCalculated, measureUnit };
    for (const key of ["mia", "bos", "chi", "vin"] as const) {
      const header = key.toUpperCase();
      const n = cellToNumber(cells[header]);
      if (n !== null) {
        if (Number.isNaN(n)) errors.push(`${header} must be a number, or left blank.`);
        else data[key] = n;
      }
    }

    if (errors.length > 0) return { data: null, errors };
    return { data, errors: [] };
  },
};

const TYPE_OPTIONS = ["R", "P"] as const;
const PACKAGING_OPTIONS = ["CLA", "BAG", "BOX"] as const;

export const transportCostSchema: ReferenceTableSchema = {
  resourceId: "transport-cost",
  sheetName: "Transport Cost",
  label: "Transport Cost",
  description:
    'Per-customer, per-package-size transport cost. Type must be "R" or "P"; Packaging must be "CLA", "BAG", or "BOX". Leave Warehouse blank unless this customer is genuinely fulfilled from more than one warehouse at different transport costs (blank = applies regardless of warehouse). Leave Pack Size blank unless the same package size (oz/lb) ships in more than one pack count, e.g. a 3-pack vs a 6-pack (blank = applies regardless of pack size). Do NOT add Units/Pallet or Transport $/unit columns -- those are computed automatically.',
  naturalKeyColumns: ["divisionName", "measurementUnitValue", "warehouse", "packQty"],
  columns: [
    { key: "divisionName", header: "Customer", type: "string", required: true, example: "WAL-MART ARCADIA" },
    { key: "type", header: "Type", type: "enum", required: true, example: "R", enumOptions: TYPE_OPTIONS },
    { key: "packaging", header: "Packaging", type: "enum", required: true, example: "BAG", enumOptions: PACKAGING_OPTIONS },
    { key: "measurementUnitValue", header: "Package Size", type: "number", required: true, example: 1 },
    { key: "warehouse", header: "Warehouse", type: "string", required: false, example: "" },
    { key: "packQty", header: "Pack Size", type: "number", required: false, example: "" },
    { key: "qty", header: "Qty", type: "number", required: true, example: 24 },
    { key: "boxesXPallet", header: "Boxes/Pallet", type: "number", required: false, example: 88 },
    { key: "palletCost", header: "Pallet Cost", type: "number", required: false, example: 120 },
  ],
  exampleRow: {
    Customer: "WAL-MART ARCADIA",
    Type: "R",
    Packaging: "BAG",
    "Package Size": 1,
    Warehouse: "",
    "Pack Size": "",
    Qty: 24,
    "Boxes/Pallet": 88,
    "Pallet Cost": 120,
  },
  parseRow(cells) {
    const errors: string[] = [];
    const divisionName = cellToText(cells["Customer"]);
    const type = cellToText(cells["Type"]).toUpperCase();
    const packaging = cellToText(cells["Packaging"]).toUpperCase();
    const measurementUnitValue = cellToNumber(cells["Package Size"]);
    const warehouse = cellToText(cells["Warehouse"]).toUpperCase() || null;
    const packQty = cellToNumber(cells["Pack Size"]);
    const qty = cellToNumber(cells["Qty"]);
    const boxesXPallet = cellToNumber(cells["Boxes/Pallet"]);
    const palletCost = cellToNumber(cells["Pallet Cost"]);

    if (!divisionName) errors.push("Customer is required.");
    if (!TYPE_OPTIONS.includes(type as (typeof TYPE_OPTIONS)[number])) {
      errors.push(`Type must be one of: ${TYPE_OPTIONS.join(", ")}.`);
    }
    if (!PACKAGING_OPTIONS.includes(packaging as (typeof PACKAGING_OPTIONS)[number])) {
      errors.push(`Packaging must be one of: ${PACKAGING_OPTIONS.join(", ")}.`);
    }
    if (measurementUnitValue === null || Number.isNaN(measurementUnitValue)) errors.push("Package Size is required and must be a number.");
    else if (measurementUnitValue <= 0) errors.push("Package Size must be greater than 0.");
    if (packQty !== null && (Number.isNaN(packQty) || packQty <= 0)) {
      errors.push("Pack Size must be a whole number greater than 0, or left blank.");
    }
    if (qty === null || Number.isNaN(qty)) errors.push("Qty is required and must be a number.");
    else if (qty <= 0) errors.push("Qty must be greater than 0.");
    if (boxesXPallet !== null && (Number.isNaN(boxesXPallet) || boxesXPallet <= 0)) {
      errors.push("Boxes/Pallet must be a number greater than 0, or left blank.");
    }
    if (palletCost !== null && Number.isNaN(palletCost)) {
      errors.push("Pallet Cost must be a number, or left blank.");
    }
    if ("Units/Pallet" in cells || "Transport $/unit" in cells) {
      errors.push("Units/Pallet and Transport $/unit are computed automatically -- remove those columns.");
    }

    if (errors.length > 0) return { data: null, errors };
    return {
      data: {
        divisionName,
        type,
        packaging,
        measurementUnitValue,
        warehouse: warehouse ?? undefined,
        packQty: packQty ?? undefined,
        qty,
        boxesXPallet: boxesXPallet ?? undefined,
        palletCost: palletCost ?? undefined,
      },
      errors: [],
    };
  },
};

// No BulkUpsertAdapter for Rebate -- it has no natural-key conflict at all
// (every customer already has an implicit $0 rebate) and no create/update
// split, just always-upsert. The bulk-upsert engine handles this
// resourceId's upsertOnly path directly rather than forcing it through the
// adapter interface every other entity implements -- same "don't force it
// into the same mold" reasoning as rebate-card.tsx's own UI.
export const rebateSchema: ReferenceTableSchema = {
  resourceId: "rebate",
  sheetName: "Rebate",
  label: "Rebate",
  description:
    "A flat per-unit dollar amount subtracted from Avg Unit Sale Price, per customer. Every customer already has an implicit $0 rebate -- uploading always sets/replaces the value, there's no separate create step.",
  naturalKeyColumns: [],
  upsertOnly: true,
  columns: [
    { key: "customer", header: "Customer", type: "string", required: true, example: "WAL-MART ARCADIA" },
    { key: "rebateValue", header: "Rebate ($)", type: "number", required: true, example: 0.1 },
  ],
  exampleRow: { Customer: "WAL-MART ARCADIA", "Rebate ($)": 0.1 },
  parseRow(cells) {
    const errors: string[] = [];
    const customer = cellToText(cells["Customer"]);
    const rebateValue = cellToNumber(cells["Rebate ($)"]);

    if (!customer) errors.push("Customer is required.");
    if (rebateValue === null || Number.isNaN(rebateValue)) errors.push("Rebate ($) is required and must be a number.");
    else if (rebateValue < 0) errors.push("Rebate ($) must be 0 or more.");

    if (errors.length > 0) return { data: null, errors };
    return { data: { customer, rebateValue }, errors: [] };
  },
};

export const varietyDesegregationSchema: ReferenceTableSchema = {
  resourceId: "variety-desegregation",
  sheetName: "Mixed Herbs",
  label: "Mixed Herb Composition",
  description:
    'Which single-herb varieties make up each blend, and how many of each. Parent and Child must be different varieties. Leave Factor blank for a normal count-based blend (defaults to 1) -- only set it for a percentage-based blend with no natural count, like an equal 3-way split (Factor = 0.333333 for each component).',
  naturalKeyColumns: ["parentVariety", "childVariety"],
  columns: [
    { key: "parentVariety", header: "Blend (Parent)", type: "string", required: true, example: 'MIXED HERBS - CLAMSHELL 12 ROS-10 THY-5 CUL-5 DILL 0.5 OZ 32 CT Conventional' },
    { key: "childVariety", header: "Component (Child)", type: "string", required: true, example: "ROSEMARY - CLAMSHELL 0.5 OZ Conventional" },
    { key: "quantity", header: "Quantity", type: "number", required: true, example: 12 },
    { key: "factor", header: "Factor", type: "number", required: false, example: "" },
  ],
  exampleRow: {
    "Blend (Parent)": "MIXED HERBS - CLAMSHELL 12 ROS-10 THY-5 CUL-5 DILL 0.5 OZ 32 CT Conventional",
    "Component (Child)": "ROSEMARY - CLAMSHELL 0.5 OZ Conventional",
    Quantity: 12,
    Factor: "",
  },
  parseRow(cells) {
    const errors: string[] = [];
    const parentVariety = cellToText(cells["Blend (Parent)"]);
    const childVariety = cellToText(cells["Component (Child)"]);
    const quantity = cellToNumber(cells["Quantity"]);
    const factor = cellToNumber(cells["Factor"]);

    if (!parentVariety) errors.push("Blend (Parent) is required.");
    if (!childVariety) errors.push("Component (Child) is required.");
    if (parentVariety && childVariety && parentVariety === childVariety) {
      errors.push("Blend (Parent) and Component (Child) must be different varieties.");
    }
    if (quantity === null || Number.isNaN(quantity)) errors.push("Quantity is required and must be a number.");
    else if (quantity <= 0) errors.push("Quantity must be greater than 0.");
    if (factor !== null && (Number.isNaN(factor) || factor <= 0 || factor > 1)) {
      errors.push("Factor must be greater than 0 and no more than 1, or left blank.");
    }

    if (errors.length > 0) return { data: null, errors };
    return { data: { parentVariety, childVariety, quantity, factor: factor ?? undefined }, errors: [] };
  },
};

export const REFERENCE_SCHEMAS: ReferenceTableSchema[] = [
  commissionSchema,
  yieldsSchema,
  costReferenceSchema,
  extraCostSchema,
  transportCostSchema,
  rebateSchema,
  varietyDesegregationSchema,
];

export function getReferenceSchema(resourceId: string): ReferenceTableSchema {
  const schema = REFERENCE_SCHEMAS.find((s) => s.resourceId === resourceId);
  if (!schema) throw new Error(`Unknown reference resource: ${resourceId}`);
  return schema;
}
