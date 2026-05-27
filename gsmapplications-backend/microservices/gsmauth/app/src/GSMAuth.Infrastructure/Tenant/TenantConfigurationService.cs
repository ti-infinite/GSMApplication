using GSMAuth.Abstractions;
using GSMAuth.DataAccess.ContextDb;
using Microsoft.EntityFrameworkCore;

namespace GSMAuth.Infrastructure.Tenant;

public sealed class TenantConfigurationService : ITenantConfigurationService
{
    private readonly RegistryDbContext _context;

    public TenantConfigurationService(RegistryDbContext context)
    {
        _context = context;
    }

    public async Task<string?> GetJsonStylesAsync(string companyId, CancellationToken cancellationToken)
    {
        return await _context.Tenants
            .AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.IsActive)
            .Select(x => x.JsonStyles)
            .FirstOrDefaultAsync(cancellationToken);
    }
}