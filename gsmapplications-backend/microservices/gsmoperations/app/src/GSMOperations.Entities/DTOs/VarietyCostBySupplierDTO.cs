namespace GSMOperations.Entities.DTOs;

public sealed class VarietyCostBySupplierDTO
{
    public int IdVariety { get; set; }
    public Guid IdSupplier { get; set; }
    public decimal ProductionCost { get; set; }
    public decimal? ExtraCost { get; set; }
}