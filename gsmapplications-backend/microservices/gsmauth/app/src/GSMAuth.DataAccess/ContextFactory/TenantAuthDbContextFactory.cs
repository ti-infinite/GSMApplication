using GSMAuth.DataAccess.ContextDb;
using Microsoft.EntityFrameworkCore;

namespace GSMAuth.DataAccess.ContextFactory;

public sealed class TenantAuthDbContextFactory
{
    public static TenantAuthDbContext Create(string tenantConnectionString)
    {
        var optionsBuilder = new DbContextOptionsBuilder<TenantAuthDbContext>();
        optionsBuilder.UseSqlServer(tenantConnectionString);
        return new TenantAuthDbContext(optionsBuilder.Options);
    }
}
