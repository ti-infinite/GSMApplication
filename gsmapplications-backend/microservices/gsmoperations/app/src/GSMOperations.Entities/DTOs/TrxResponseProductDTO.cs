namespace GSMOperations.Entities.DTOs;

public sealed class TrxResponseProductDTO
{
    public required long IdTrxProduct { get; set; }

    public required int IdVariety { get; set; }

    public string? VarietyName { get; set; }

    public string? Sku { get; set; }

    public decimal? Qty { get; set; }

    public string? MeasurementUnit { get; set; }

    public List<TrxProductAttributesDTO> TrxProductAttributes { get; set; } = new();


}