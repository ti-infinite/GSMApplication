namespace GSMOperations.Entities.DTOs;

public sealed class TrxResponseAttributeDTO
{
    
    public required long IdTrxAttribute { get; set; }

    public required string AttributeKey { get; set; }

    public string? AttributeValue { get; set; }

}