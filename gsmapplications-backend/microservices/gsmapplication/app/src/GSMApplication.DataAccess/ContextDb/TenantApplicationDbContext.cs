using Microsoft.EntityFrameworkCore;

namespace GSMApplication.DataAccess.ContextDb;

public sealed class TenantApplicationDbContext : DbContext
{
    public TenantApplicationDbContext(DbContextOptions<TenantApplicationDbContext> options)
        : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
    }
}
