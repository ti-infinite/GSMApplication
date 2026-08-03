namespace GSMOperations.Entities.Models.Transactions;

public sealed class JsonReaDefinition
{
    public List<JsonReaResources> Resources { get; set; } = [];
    public List<JsonReaEvents> Events { get; set; } = [];

}