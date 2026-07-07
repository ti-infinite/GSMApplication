// "yyyy-MM-dd HH:mm:ss" (UTC) — used for string attributeValues in transaction
// payloads (StartDate, EndDate, LAP RecordDate).
export function formatUtc(date: Date): string {
  return date.toISOString().replace('T', ' ').split('.')[0]
}
