using GSMOperations.Abstractions;
using GSMOperations.DataAccess.ContextDb;
using GSMOperations.DataAccess.Mappers;
using GSMOperations.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.Infrastructure.Tenant
{
    public sealed class TenantConnectionResolver : ITenantConnectionResolver
    {
        private readonly RegistryDbContext _registryDbContext;

        public TenantConnectionResolver(RegistryDbContext registryDbContext)
        {
            _registryDbContext = registryDbContext;
        }

        public async Task<TenantConnectionInfo?> ResolveAsync(string companyId, CancellationToken cancellationToken = default)
        {
            var tenantRecord = await _registryDbContext.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.CompanyId == companyId && x.IsActive,
                    cancellationToken);

            return tenantRecord?.ToConnectionInfo();
        }
    }
}
