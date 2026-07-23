using GSMOperations.Entities.Models.Events;

namespace GSMOperations.Abstractions;

public interface IEmailService
{
    Task SendAsync(EmailRequest request, CancellationToken cancellationToken = default);
}