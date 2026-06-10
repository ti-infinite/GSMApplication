namespace GSMOperations.Entities.DTOs;

public sealed class TrxResponseDTO
{
    
    public required long IdTrxHeader { get; set; }
    public required string TrxPrefix { get; set; }
    public required string TrxDocument { get; set; }
    public string? Descr { get; set; }
    public required DateTime TrxDate { get; set; }
    public required string Status { get; set; }
    public required string Username { get; set; }
    public string? Location { get; set; }
    public List<TrxResponseAttributeDTO> TrxAttributes { get; set; } = new();
    public List<TrxResponseProductDTO> TrxProducts { get; set; } = new();
    public List<TrxResponseStateDTO> TrxStates { get; set; } = new();
    public List<TrxResponseDetailDTO> TrxDetails { get; set; } = new();


}