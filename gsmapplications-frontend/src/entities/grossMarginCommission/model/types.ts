// Mirrors db_ai.CustomerCommission (sql/22_customer_commission.sql), as
// returned by the relay's GET /commission.
export interface CommissionRow {
  Id: number;
  Customer: string;
  Variety: string;
  CommissionType: "percent" | "value";
  CommissionPercent: number | null;
  CommissionValue: number | null;
  BaseUnitPrice: number | null;
  CreatedAt: string;
  UpdatedAt: string;
}
