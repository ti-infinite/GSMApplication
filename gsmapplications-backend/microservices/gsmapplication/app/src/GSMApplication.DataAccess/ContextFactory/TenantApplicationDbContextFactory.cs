using GSMApplication.DataAccess.ContextDb;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.DataAccess.ContextFactory;

public sealed class TenantApplicationDbContextFactory
{
    public static TenantApplicationDbContext Create(string tenantConnectionString)
    {
        var optionsBuilder = new DbContextOptionsBuilder<TenantApplicationDbContext>();
        optionsBuilder.UseSqlServer(tenantConnectionString);
        return new TenantApplicationDbContext(optionsBuilder.Options);
    }
}
