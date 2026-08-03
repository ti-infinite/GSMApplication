using GSMOperations.Entities.Models.Events;

namespace GSMOperations.Abstractions;

public interface IAgentNotificacions
{
    Task<int> SendAsync(NotificationRequest request, CancellationToken cancellationToken = default);
}