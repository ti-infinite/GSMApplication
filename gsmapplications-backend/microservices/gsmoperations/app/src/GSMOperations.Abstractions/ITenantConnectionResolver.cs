

using GSMOperations.Entities.Models;

namespace GSMOperations.Abstractions
{
    public interface ITenantConnectionResolver
    {
        Task<TenantConnectionInfo?> ResolveAsync(string companyId, CancellationToken cancellationToken = default);
    }
}
