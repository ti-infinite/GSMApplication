namespace GSMOperations.Entities.DTOs;

public sealed class InventorySDTO
{
    public required int idVariety { get; set; }
    public required string varietyName { get; set; }
    public required string measurementUnit { get; set; }
    public required string sku { get; set; }
    public required decimal remaining { get; set; }
}