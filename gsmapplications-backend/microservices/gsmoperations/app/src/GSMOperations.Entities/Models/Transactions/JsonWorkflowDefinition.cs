namespace GSMOperations.Entities.Models.Transactions;

public sealed class JsonWorkflowDefinition
{
    public string InitialState { get; set; } = string.Empty;
    public List<string> States { get; set; } = [];
    public List<JsonWorkflowTransition> Transitions { get; set; } = [];

}