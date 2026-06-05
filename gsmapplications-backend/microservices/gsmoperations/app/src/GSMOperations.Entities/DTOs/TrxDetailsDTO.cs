namespace GSMOperations.Entities.DTOs;

public sealed class TrxDetailsDTO
{
    public required string DetailType { get; set; }
    public string DetailValue { get; set; } = string.Empty;

}