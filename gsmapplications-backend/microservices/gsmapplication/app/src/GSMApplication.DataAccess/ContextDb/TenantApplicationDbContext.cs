using GSMApplication.DataAccess.Entities;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.DataAccess.ContextDb;

public partial class TenantApplicationDbContext : DbContext
{
    public TenantApplicationDbContext(DbContextOptions<TenantApplicationDbContext> options)
        : base(options) { }

    public virtual DbSet<MultimediaResource> MultimediaResources => Set<MultimediaResource>();
    public virtual DbSet<ApiRule> ApiRules => Set<ApiRule>();
    public virtual DbSet<User> Users => Set<User>();
    public virtual DbSet<Profile> Profiles => Set<Profile>();

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

        modelBuilder.Entity<Profile>(entity =>
        {
            entity.HasKey(e => e.IdProfile).HasName("PK_TBL_Rol");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.IdUser).HasName("PK__Users__B7C9263823CD5ACB");

            entity.Property(e => e.IdUser).HasDefaultValueSql("(newid())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.HasOne(d => d.IdProfileNavigation).WithMany(p => p.Users).HasConstraintName("FK_Users_Profiles");
        });


        base.OnModelCreating(modelBuilder);
    }
}
