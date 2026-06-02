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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<GlobalParameter>(entity =>
            {
                entity.HasKey(e => e.IdParameter).HasName("PK_IdParameter");
            });

            modelBuilder.Entity<ParamAttribute>(entity =>
            {
                entity.HasKey(e => e.IdParamAttribute).HasName("PK_IdParamAttribute");

                entity.HasOne(d => d.IdParameterNavigation).WithMany(p => p.ParamAttributes)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("FK_ParamAttributes_GlobalParameters");
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}
