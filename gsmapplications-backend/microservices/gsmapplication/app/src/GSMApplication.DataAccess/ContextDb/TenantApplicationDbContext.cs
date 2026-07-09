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
    public virtual DbSet<Location> Locations => Set<Location>();
    public virtual DbSet<StoredProcedureRule> StoredProcedureRules => Set<StoredProcedureRule>();


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

        modelBuilder.Entity<Location>(entity =>
        {
            entity.HasKey(e => e.IdLocation).HasName("PK__Location__FB5FABA941C68247");

            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<StoredProcedureRule>(entity =>
        {
            entity.HasKey(e => e.IdStoredProcedure).HasName("PK__StoredPr__D79D1B9D75654BA5");
        });

        modelBuilder.Entity<Location>(entity =>
        {
            entity.HasKey(e => e.IdLocation).HasName("PK__Location__FB5FABA941C68247");

            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.HasIndex(e => e.CodeLocation)
                .IsUnique()
                .HasDatabaseName("UQ_Locations_CodeLocation");
        });

        base.OnModelCreating(modelBuilder);
    }
}
