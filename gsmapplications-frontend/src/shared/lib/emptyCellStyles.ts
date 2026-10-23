// Shared "no data" treatment for a plain numeric table cell showing the
// format.ts "—" placeholder -- same muted box ZoneCell/the Gross Margin
// cell already use for their own unknown-zone case, so every empty cell in
// Gross Margin reads the same way instead of looking like a stray number.
// bg-muted alone barely differs from the page/card background in GSM's
// light theme (both sit around 0.97 lightness) -- a visible border is what
// actually reads as "a box" at a glance, same reasoning as the Tabs active
// indicator fix.
export const EMPTY_CELL_CLASSES =
  "inline-block w-full rounded-md border border-border bg-muted px-2 py-1 text-center text-muted-foreground";
