using GSMAuth.Entities.Models;

namespace GSMAuth.Abstractions;

public interface ITenantConnectionResolver
{
    Task<TenantConnectionInfo?> ResolveAsync(string companyId, CancellationToken cancellationToken = default);
}
