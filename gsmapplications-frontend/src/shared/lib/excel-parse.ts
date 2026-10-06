// Next.js -> Vite conversion: runs in the BROWSER now, not server-side.
// Parses an uploaded workbook's matching sheet (by name, per reference-
// schemas.ts) into rows run through that schema's parseRow(). A missing/
// misnamed sheet or missing required column is a clear top-level error
// before any row parsing happens -- never an empty/silent result.
//
// Moved here from features/bulk-upload-reference-data/api/ (where it ran
// server-side, fed by a raw file upload to this app's own Next.js route)
// because shared/ui/reference-bulk-upload.tsx -- a shared-layer component
// every entity's own Card renders -- now calls it directly: the browser
// parses+validates the file itself, then sends only the already-parsed
// rows (JSON) to the relay's /bulk/<resource>/preview|commit, which does
// just the semantic step (does this Variety/Customer/etc. actually exist,
// create vs. update -- see gross-margin-relay/bulk_export.py). shared/
// can't import from features/, so this couldn't stay where it was.

import ExcelJS from "exceljs";
import type { ParsedRow, ReferenceTableSchema } from "./reference-schemas";

export interface ParsedRowWithNumber extends ParsedRow {
  rowNumber: number; // 1-based Excel row number, for user-facing messages
}

export interface ExcelParseResult {
  ok: boolean;
  topLevelError?: string;
  rows: ParsedRowWithNumber[];
}

export async function parseReferenceUpload(
  buffer: ArrayBuffer,
  schema: ReferenceTableSchema
): Promise<ExcelParseResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    // Browser-native path -- exceljs accepts a raw ArrayBuffer directly
    // here, no Node Buffer conversion needed (that was only ever required
    // server-side).
    await workbook.xlsx.load(buffer);
  } catch (err) {
    console.error("Failed to parse uploaded workbook:", err);
    return { ok: false, topLevelError: "Couldn't read this file — is it a valid .xlsx file?", rows: [] };
  }

  const sheet = workbook.getWorksheet(schema.sheetName);
  if (!sheet) {
    return {
      ok: false,
      topLevelError: `This file has no sheet named "${schema.sheetName}" — make sure you're uploading the right sheet (or the full template workbook).`,
      rows: [],
    };
  }

  // Row 1 must be the header row, matching schema.columns' headers exactly
  // for every REQUIRED column (extra/unrecognized columns are ignored, not
  // an error -- someone may have added their own notes column).
  const headerRow = sheet.getRow(1);
  const headerByColumnIndex = new Map<number, string>();
  headerRow.eachCell((cell, colNumber) => {
    const text = String(cell.value ?? "").trim();
    if (text) headerByColumnIndex.set(colNumber, text);
  });
  const foundHeaders = new Set(headerByColumnIndex.values());
  const missingRequired = schema.columns.filter((c) => c.required && !foundHeaders.has(c.header));
  if (missingRequired.length > 0) {
    return {
      ok: false,
      topLevelError: `Missing required column(s): ${missingRequired.map((c) => c.header).join(", ")}. Re-download the template if you're not sure of the exact column names.`,
      rows: [],
    };
  }

  const rows: ParsedRowWithNumber[] = [];
  // Data conventionally starts at row 4 (1=header, 2=instruction note,
  // 3=example row), but rows are identified by CONTENT, not position, so
  // this tolerates someone reordering/deleting rows. The note row's first
  // cell always starts with "# EXAMPLE"; the example DATA row is skipped
  // by matching its values against schema.exampleRow exactly (not by
  // position) -- catches the case where someone forgot to delete the
  // literal example row before uploading, without risking a false match on
  // a real row that merely resembles it.
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const firstCellText = String(row.getCell(1).value ?? "").trim();
    if (firstCellText.startsWith("# EXAMPLE")) continue;

    const cells: Record<string, unknown> = {};
    let hasAnyValue = false;
    let matchesExampleRow = true;
    headerByColumnIndex.forEach((header, colNumber) => {
      const raw = row.getCell(colNumber).value;
      const value = typeof raw === "object" && raw !== null && "result" in raw ? (raw as { result: unknown }).result : raw;
      if (value !== null && value !== undefined && String(value).trim() !== "") hasAnyValue = true;
      cells[header] = value;

      const expected = schema.exampleRow[header];
      const expectedText = expected === undefined ? "" : String(expected).trim();
      const actualText = value === null || value === undefined ? "" : String(value).trim();
      if (actualText !== expectedText) matchesExampleRow = false;
    });
    if (!hasAnyValue) continue; // silently skip genuinely blank rows, not an error
    if (matchesExampleRow) continue; // the literal template example, left in by mistake

    const { data, errors } = schema.parseRow(cells);
    rows.push({ rowNumber, data, errors });
  }

  return { ok: true, rows };
}
