// REWRITE (2026-10-08): mirrors the gross-margin-pipeline repo's own same-day
// rewrite -- no longer db_ai.CustomerCommission (dropped), now a narrow read
// of db_ms.Clients/db_ms.ClientAttributes (AttributeKey='CommissionType'/
// 'CommissionAmount'), same mechanism as RebateRow. Applies per Customer
// only now, never per Variety -- team decision, confirmed Commission never
// varied by Variety in practice.
export interface CommissionRow {
  Customer: string;
  CommissionType: "percent" | "value";
  CommissionAmount: number;
}
