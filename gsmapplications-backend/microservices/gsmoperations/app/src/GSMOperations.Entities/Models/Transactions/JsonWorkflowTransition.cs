namespace GSMOperations.Entities.Models.Transactions;

public sealed class JsonWorkflowTransition
{
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public List<string> Event { get; set; } = [];


}