namespace GSMOperations.Entities.Models.Transactions;

public sealed class JsonReaResources
{
    public string Id { get; set; } = string.Empty;
    public string Descr { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public List<JsonReaParameters> Parameters { get; set; } = [];
}