namespace GSMOperations.Entities.Models.Transactions;

public sealed class JsonReaParameters
{
    public string Key { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public List<string> Values { get; set; } = [];
}