
namespace GSMOperations.Entities.Models.Events;

public sealed class NotificationRequest
{
    public required string NotificationType { get; set; }

    public string? AttType { get; set; }

    public string? AttDocumentType { get; set; }

    public string? AttValue { get; set; }

    public required List<string> To { get; set; }

    public string? Subject { get; set; }

    public string? Body { get; set; }

    public string? BodyType { get; set; }

}