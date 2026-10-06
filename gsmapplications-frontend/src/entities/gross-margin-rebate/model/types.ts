// From the relay's GET /rebate -- not a db_ai table, a narrow read of
// db_ms.Clients/db_ms.ClientAttributes (AttributeKey='Rebate'), shared ERP
// master data this pipeline doesn't own. RebateRowCount surfaces the known
// duplicate-Rebate-row data-quality case (should always be 1 in practice --
// see sql/15_sales.sql's 2026-07-21 addendum).
export interface RebateRow {
  Customer: string;
  Rebate: number;
  RebateRowCount: number;
}
