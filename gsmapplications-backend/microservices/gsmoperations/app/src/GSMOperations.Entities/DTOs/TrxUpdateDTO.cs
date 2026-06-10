namespace GSMOperations.Entities.DTOs;

public sealed class TrxUpdateDTO
{
    public List<TrxAttributesDTO> TrxAttributes { get; set; } = new List<TrxAttributesDTO>();
    public List<TrxProductsDTO> TrxProducts { get; set; } = new List<TrxProductsDTO>();
    public TrxStatesDTO? TrxStates { get; set; }
    public List<TrxDetailsDTO> TrxDetails { get; set; } = new List<TrxDetailsDTO>();

}