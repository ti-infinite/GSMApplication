namespace GSMOperations.Entities.DTOs;

public sealed class TrxCreateDTO
{
    public required string TrxPrefix { get; set; }
    public string Descr { get; set; } = string.Empty;
    public required string Username { get; set; }
    public string? Location { get; set; }
    public List<TrxAttributesDTO> TrxAttributes { get; set; } = new List<TrxAttributesDTO>();
    public List<TrxProductsDTO> TrxProducts { get; set; } = new List<TrxProductsDTO>();
    public required TrxStatesDTO TrxStates { get; set; }
    public required List<TrxDetailsDTO> TrxDetails { get; set; }

}