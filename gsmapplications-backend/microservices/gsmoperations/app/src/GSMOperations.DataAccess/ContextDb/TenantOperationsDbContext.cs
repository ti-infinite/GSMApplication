using GSMOperations.DataAccess.Entities;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.ContextDb
{
    public partial class TenantOperationsDbContext : DbContext
    {
        public TenantOperationsDbContext(DbContextOptions<TenantOperationsDbContext> options) : base(options) 
        { 
        
        }

        public virtual DbSet<GlobalParameter> GlobalParameters => Set<GlobalParameter>();
        public virtual DbSet<ParamAttribute> ParamAttributes => Set<ParamAttribute>();
        public virtual DbSet<MasterProduct> MasterProducts => Set<MasterProduct>();
        public virtual DbSet<MasterVariety> MasterVarieties => Set<MasterVariety>();
        public virtual DbSet<Employee> Employees => Set<Employee>();
        public virtual DbSet<Supplier> Suppliers => Set<Supplier>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<GlobalParameter>(entity =>
            {
                entity.HasKey(e => e.IdParameter).HasName("PK_IdParameter");
                entity.HasMany(x => x.ParamAttributes)
                .WithOne(x => x.GlobalParameter)
                .HasForeignKey(x => x.IdParameter)
                .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ParamAttribute>(entity =>
            {
                entity.HasKey(e => e.IdParamAttribute).HasName("PK_IdParamAttribute");
            });

            modelBuilder.Entity<MasterProduct>(entity =>
            {
                entity.HasKey(e => e.IdMasterProduct).HasName("PK_IdMasterProduct");
                entity.Property(e => e.ProductCode).HasComputedColumnSql("(replace(str(CONVERT([varchar](9),[IdMasterProduct]),(9)),' ','0'))", false);
                entity.Property(e => e.Sku).HasComputedColumnSql("(concat(isnull([CategorySKU],''),isnull([GeneratedSKU],''),replace(str(CONVERT([varchar](9),[IdMasterProduct]),(9)),' ','0')))", false);

                entity.HasMany(x => x.MasterVarieties)
                .WithOne(x => x.MasterProduct)
                .HasForeignKey(x => x.IdMasterProduct)
                .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<MasterVariety>(entity =>
            {
                entity.HasKey(e => e.IdVariety).HasName("PK_IdVariety");
            });

            modelBuilder.Entity<Employee>(entity =>
            {
                entity.Property(e => e.FullName).HasComputedColumnSql("(concat([FirstName],' ',isnull([LastName],'')))", false);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
            });

            modelBuilder.Entity<Supplier>(entity =>
            {
                entity.HasKey(e => e.IdSupplier).HasName("PK__Supplier__F2C105E8EC40F705");

                entity.Property(e => e.IdSupplier).HasDefaultValueSql("(newid())");
                entity.Property(e => e.Country).IsFixedLength();
                entity.Property(e => e.IsActive).HasDefaultValue(true);
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}
