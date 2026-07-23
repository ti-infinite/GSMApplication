namespace GSMOperations.Entities.Models.Events;

public sealed class EmailAttachment
{
    public string FileName { get; set; } = string.Empty;

    public byte[] Content { get; set; } = [];

    public string ContentType { get; set; } = string.Empty;
}