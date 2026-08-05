namespace GSMOperations.Entities.Models;

public sealed class SearchTrx
{
    public string? TrxPrefix { get; set; }
    public string? TrxDocument { get; set; }
    public DateTime? TrxDateFrom { get; set; }
    public DateTime? TrxDateTo { get; set; }
    public string? Status { get; set; }
    public string? Location { get; set; }

}