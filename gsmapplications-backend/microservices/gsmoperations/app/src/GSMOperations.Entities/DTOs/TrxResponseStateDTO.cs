namespace GSMOperations.Entities.DTOs;

public sealed class TrxResponseStateDTO
{
    public required long IdTrxState { get; set; }

    public string? TrxState { get; set; }

    public DateTime? StateDate { get; set; }

    public string? Comments { get; set; }

}