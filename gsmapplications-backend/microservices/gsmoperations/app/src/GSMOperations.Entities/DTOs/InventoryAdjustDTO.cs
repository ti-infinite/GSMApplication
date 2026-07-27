namespace GSMOperations.Entities.DTOs;

public class InventoryAdjustDTO
{
    public string TrxDocument { get; init; } = null!;
    public required decimal Qty { get; init; }
    public required DateTime TrxDate { get; init; }
    public int IdVariety { get; init; }
    public string VarietyName { get; init; } = null!;
    public string CodeLocation { get; init; } = null!;
    public string SKU { get; set; } = null!;
}