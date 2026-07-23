
namespace GSMOperations.Entities.Models.Events;

public sealed class EmailRequest
{
    public string From { get; set; } = string.Empty;
    public List<string> To { get; set; } = [];

    public string Subject { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    public List<EmailAttachment> Attachments { get; set; } = [];
}