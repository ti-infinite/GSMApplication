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
        public virtual DbSet<TrxHeader> TrxHeaders => Set<TrxHeader>();
        public virtual DbSet<TrxAttribute> TrxAttributes => Set<TrxAttribute>();
        public virtual DbSet<TrxProduct> TrxProducts => Set<TrxProduct>();
        public virtual DbSet<TrxStates> TrxStates => Set<TrxStates>();
        public virtual DbSet<TrxDetail> TrxDetails => Set<TrxDetail>();
        public virtual DbSet<StoredProcedureRule> StoredProcedureRules => Set<StoredProcedureRule>();
        public virtual DbSet<TrxDefinition> TrxDefinitions => Set<TrxDefinition>();
        public virtual DbSet<TrxProductAttribute> TrxProductAttributes => Set<TrxProductAttribute>();
        public virtual DbSet<InventoryTraceability> InventoryTraceabilities => Set<InventoryTraceability>();

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
            });

            modelBuilder.Entity<MasterVariety>(entity =>
            {
                entity.HasKey(e => e.IdVariety).HasName("PK_IdVariety");

                entity.HasOne(x => x.MasterProduct)
                .WithMany(x => x.MasterVarieties)
                .HasForeignKey(x => x.IdMasterProduct)
                .OnDelete(DeleteBehavior.Restrict);
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

            modelBuilder.Entity<TrxAttribute>(entity =>
            {
                entity.HasKey(e => e.IdTrxAttribute).HasName("PK_IdTrxAttribute");

                entity.HasOne(d => d.TrxHeader)
                    .WithMany(p => p.TrxAttributes)
                    .HasForeignKey(p => p.IdTrxHeader)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("FK_TrxAttributes_TrxHeaders");
            });

            modelBuilder.Entity<TrxHeader>(entity =>
            {
                entity.HasKey(e => e.IdTrxHeader).HasName("PK_IdTrxHeader");
                //entity.Property(e => e.Status).HasDefaultValue("COMPLETED");
            });

            modelBuilder.Entity<TrxProduct>(entity =>
            {
                entity.HasKey(e => e.IdTrxProduct).HasName("PK_IdTrxProduct");

                entity.HasOne(d => d.TrxHeader)
                    .WithMany(p => p.TrxProducts)
                    .HasForeignKey(p => p.IdTrxHeader)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("FK_TrxProducts_TrxHeaders");
            });

            modelBuilder.Entity<TrxStates>(entity =>
            {
                entity.HasKey(e => e.IdTrxState).HasName("PK_IdTrxState");

                entity.HasOne(d => d.TrxHeader)
                    .WithMany(p => p.TrxStates)
                    .HasForeignKey(p => p.IdTrxHeader)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("FK_TrxStates_TrxHeaders");
            });

            modelBuilder.Entity<TrxDetail>(entity =>
            {
                entity.HasKey(e => e.IdTrxDetail).HasName("PK_IdTrxDetail");

                entity.HasOne(d => d.TrxHeader)
                    .WithMany(p => p.TrxDetails)
                    .HasForeignKey(p => p.IdTrxHeader)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("FK_TrxDetails_TrxHeaders");
            });

            modelBuilder.Entity<StoredProcedureRule>(entity =>
            {
                entity.HasKey(e => e.IdStoredProcedure).HasName("PK__StoredPr__D79D1B9D75654BA5");
            });

            modelBuilder.Entity<TrxDefinition>(entity =>
            {
                entity.HasKey(e => e.IdTrxDefinition).HasName("PK__TrxDefin__57DA74598C6F7410");
            });

            modelBuilder.Entity<TrxProductAttribute>(entity =>
            {
                entity.HasKey(e => e.IdTrxProductAttributes).HasName("PK__TrxProdu__B3EE77414C637D07");

                entity.HasOne(d => d.TrxHeader)
                    .WithMany(p => p.TrxProductAttributes)
                    .HasForeignKey(p => p.IdTrxHeader)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("FK_TrxProductAttributes_TrxHeaders");

                entity.HasOne(d => d.TrxProduct)
                    .WithMany(p => p.TrxProductAttributes)
                    .HasForeignKey(p => p.IdTrxProduct)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("FK_TrxProductAttributes_TrxProducts");                
            });

            modelBuilder.Entity<InventoryTraceability>(entity =>
            {
                entity.HasKey(e => e.IdInventoryTraceability).HasName("PK__Inventor__B5604AA8C2969FDE");
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}
