using GSMApplication.Entities.Models;

namespace GSMApplication.Abstractions;

public interface ITenantConnectionResolver
{
    Task<TenantConnectionInfo?> ResolveAsync(string companyId, CancellationToken cancellationToken = default);
}
