namespace GSMOperations.Entities.DTOs;

public class TrxResponseDetailDTO
{
    public long IdTrxDetail { get; set; }

    public string DetailType { get; set; } = null!;

    public string? DetailValue { get; set; }
}