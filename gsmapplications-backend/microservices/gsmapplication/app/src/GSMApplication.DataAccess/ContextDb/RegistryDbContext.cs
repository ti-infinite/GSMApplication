using GSMApplication.DataAccess.Entities;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.DataAccess.ContextDb;

public sealed class RegistryDbContext : DbContext
{
    public RegistryDbContext(DbContextOptions<RegistryDbContext> options)
        : base(options) { }

    public DbSet<TenantRegistryRecord> Tenants => Set<TenantRegistryRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TenantRegistryRecord>(entity =>
        {
            entity.ToTable("Tenants");
            entity.HasKey(x => x.CompanyId);
            entity.HasIndex(x => x.CompanyId).IsUnique();
            entity.Property(x => x.IsActive).IsRequired();
        });
    }
}
