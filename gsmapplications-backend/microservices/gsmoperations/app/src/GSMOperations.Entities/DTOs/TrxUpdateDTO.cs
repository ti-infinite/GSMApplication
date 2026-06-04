namespace GSMOperations.Entities.DTOs;

public sealed class TrxUpdateDTO
{
    public required long IdTrxHeader { get; set; }
    public List<TrxAttributesDTO> TrxAttributes { get; set; } = new List<TrxAttributesDTO>();
    public List<TrxProductsDTO> TrxProducts { get; set; } = new List<TrxProductsDTO>();
    public required TrxStatesDTO TrxStates { get; set; }
    public required List<TrxDetailsDTO> TrxDetails { get; set; }

}