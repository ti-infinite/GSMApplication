using GSMApplication.DataAccess.Entities;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.DataAccess.ContextDb;

public partial class TenantApplicationDbContext : DbContext
{
    public TenantApplicationDbContext(DbContextOptions<TenantApplicationDbContext> options)
        : base(options) { }

    public virtual DbSet<MultimediaResource> MultimediaResources => Set<MultimediaResource>();
    public virtual DbSet<ApiRule> ApiRules => Set<ApiRule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {

        modelBuilder.Entity<MultimediaResource>(entity =>
        {
            entity.HasKey(e => e.IdResource).HasName("PK_IdResource");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<ApiRule>(entity =>
        {
            entity.HasKey(e => e.IdApi).HasName("PK_IdApi");
            entity.Property(e => e.IdApi).ValueGeneratedOnAdd();
        });


        base.OnModelCreating(modelBuilder);
    }
}
