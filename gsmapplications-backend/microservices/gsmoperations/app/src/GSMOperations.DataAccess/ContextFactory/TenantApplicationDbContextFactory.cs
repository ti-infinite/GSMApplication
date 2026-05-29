using GSMOperations.DataAccess.ContextDb;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.ContextFactory
{
    public sealed class TenantApplicationDbContextFactory
    {
        public static TenantOperationsDbContext Create(string tenantConnectionString)
        {
            var optionsBuilder = new DbContextOptionsBuilder<TenantOperationsDbContext>();
            optionsBuilder.UseSqlServer(tenantConnectionString);
            return new TenantOperationsDbContext(optionsBuilder.Options);
        }
    }
}
