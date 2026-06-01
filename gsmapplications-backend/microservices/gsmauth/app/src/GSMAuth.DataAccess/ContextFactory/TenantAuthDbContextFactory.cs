using GSMAuth.DataAccess.ContextDb;
using Microsoft.EntityFrameworkCore;

namespace GSMAuth.DataAccess.ContextFactory;

public static class TenantAuthDbContextFactory
{
    public static TenantAuthDbContext Create(string connectionString)
    {
        var options = new DbContextOptionsBuilder<TenantAuthDbContext>()
            .UseSqlServer(connectionString)
            .Options;

        return new TenantAuthDbContext(options);
    }
}