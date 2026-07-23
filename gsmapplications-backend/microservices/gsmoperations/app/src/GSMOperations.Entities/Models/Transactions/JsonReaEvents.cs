namespace GSMOperations.Entities.Models.Transactions;

public sealed class JsonReaEvents
{
    public string Id { get; set; } = string.Empty;
    public List<JsonReaParameters> Parameters { get; set; } = [];

}