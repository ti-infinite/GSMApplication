using GSMApplication.DataAccess.Entities;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.DataAccess.ContextDb;

public partial class TenantApplicationDbContext : DbContext
{
    public TenantApplicationDbContext(DbContextOptions<TenantApplicationDbContext> options)
        : base(options) { }

    public virtual DbSet<MultimediaResource> MultimediaResources => Set<MultimediaResource>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {

        modelBuilder.Entity<MultimediaResource>(entity =>
        {
            entity.HasKey(e => e.IdResource).HasName("PK__Resource__3E14779333AEDE18");

            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });


        base.OnModelCreating(modelBuilder);
    }
}
