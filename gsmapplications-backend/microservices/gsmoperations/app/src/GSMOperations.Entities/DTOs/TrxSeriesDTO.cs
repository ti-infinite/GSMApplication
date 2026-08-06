namespace GSMOperations.Entities.DTOs;

public sealed class TrxSeriesDTO
{
    public string Prefix { get; set; } = null!;
    public string? Descr { get; set; }
    public long? CurrentNumber { get; set; }
    public bool HasNumberByLocation { get; set; }
}