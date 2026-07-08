namespace GSMOperations.Entities.DTOs;

public sealed class TrxDefinitionDTO
{
    public required int IdTrxDefinition { get; set; }
    public string Prefix { get; set; } = null!;
    public string JsonFront { get; set; } = null!;
    public string JsonRea { get; set; } = null!;
    public string JsonWorkflow { get; set; } = null!;
}