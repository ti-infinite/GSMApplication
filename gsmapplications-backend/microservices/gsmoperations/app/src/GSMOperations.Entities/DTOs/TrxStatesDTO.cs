namespace GSMOperations.Entities.DTOs;

public sealed class TrxStatesDTO
{
    public required string FromTrxState { get; set; }
    public required string ToTrxState { get; set; }
    public string Comments { get; set; } = string.Empty;
    public DateTime StateDate { get; set; } = DateTime.UtcNow;
}