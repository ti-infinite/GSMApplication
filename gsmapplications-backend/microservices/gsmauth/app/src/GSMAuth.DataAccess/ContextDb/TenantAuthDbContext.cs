using GSMAuth.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace GSMAuth.DataAccess.ContextDb;

public sealed class TenantAuthDbContext : DbContext
{
    public TenantAuthDbContext(DbContextOptions<TenantAuthDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {

        modelBuilder.Entity<User>()
            .HasIndex(x => x.Username)
            .IsUnique();

    }
}
