namespace GSMOperations.Entities.DTOs;

public sealed class InventoryCsDTO
{
    public required int idVariety { get; set; }
    public required string varietyName { get; set; }
    public required string measurementUnit { get; set; }
    public required string sku { get; set; }
    public required decimal consumption { get; set; }
    public required decimal remaining { get; set; }
}