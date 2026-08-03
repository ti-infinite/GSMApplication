namespace GSMOperations.Entities.Models.Transactions;

public sealed class JsonTrxDefinition
{
    public required JsonReaDefinition  Rea { get; init; }
    public required JsonWorkflowDefinition Workflow { get; init; }

}