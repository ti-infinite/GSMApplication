namespace GSMOperations.Entities.DTOs;

public sealed class MasterProductDTO
{
    public string? MasterProductName { get; set; }
    public string? SKU { get; set; }
    public string? MeasurementUnit { get; set; }
    public decimal? MeasurementUnitValue { get; set; }
    public List<MasterVarietyDTO>? MV { get; set; }
}