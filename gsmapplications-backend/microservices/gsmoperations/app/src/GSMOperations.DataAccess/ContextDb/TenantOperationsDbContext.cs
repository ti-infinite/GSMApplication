using GSMOperations.DataAccess.Entities;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.DataAccess.ContextDb
{
    public partial class TenantOperationsDbContext : DbContext
    {
        public TenantOperationsDbContext(DbContextOptions<TenantOperationsDbContext> options) : base(options) 
        { 
        
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
