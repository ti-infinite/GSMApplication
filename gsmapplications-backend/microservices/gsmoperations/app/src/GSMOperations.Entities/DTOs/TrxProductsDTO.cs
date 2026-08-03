namespace GSMOperations.Entities.DTOs;

public sealed class TrxProductsDTO
{
    public required int IdVariety { get; set; }
    public string? VarietyName { get; set; }
    public string? SKU { get; set; }
    public decimal? Qty { get; set; }
    public List<TrxProductAttributesDTO> TrxProductAttributes  { get; set; } = new();

}