using System.Text.Json;
using GSMOperations.Abstractions;
using GSMOperations.DataAccess.ContextDb;
using GSMOperations.DataAccess.Entities;
using GSMOperations.Entities.Models.Events;

namespace GSMOperations.Infrastructure.Services;

public sealed class EmailNotificationAgentService : IAgentNotificacions
{
    private readonly TenantOperationsDbContext _context;

    public EmailNotificationAgentService(TenantOperationsDbContext context)
    {
        _context = context;
    }

    public async Task<int> SendAsync(NotificationRequest request, CancellationToken cancellationToken)
    {
        var notificationType = request.NotificationType;

        object body = request.BodyType == "HTML" ? 
                new { html = request.Body } : 
                new { text = request.Body };

        var jsonNotificationStruct = new
        {
            to = request.To.Select(x => new
            {
                destination = x
            }),
            content = new
            {
                subject = request.Subject,
                body
            },
            attachment = new
            {
                type = request.AttType,
                documenttype = request.AttDocumentType,
                value = request.AttValue
            }
        };

        var json = JsonSerializer.Serialize(jsonNotificationStruct);

        var entity = new Notification
        {
          NotificationType = notificationType,
          NotificationBody = json,
          IsSent = false
        };

        _context.Notifications.Add(entity);

        var result = await _context.SaveChangesAsync(cancellationToken);

        return result; 
    }


    
}