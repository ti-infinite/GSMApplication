using GSMAuth.Abstractions;
using GSMAuth.DataAccess.ContextFactory;
using GSMAuth.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace GSMAuth.Infrastructure.Repositories;

public sealed class UserAuthRepository : IUserAuthRepository
{
    private readonly ITenantConnectionResolver _tenantConnectionResolver;

    public UserAuthRepository(ITenantConnectionResolver tenantConnectionResolver)
    {
        _tenantConnectionResolver = tenantConnectionResolver;
    }

    public async Task<User?> GetByUsernameAsync(string companyId, string username, CancellationToken cancellationToken = default)
    {
        var tenantConnection = await _tenantConnectionResolver.ResolveAsync(companyId, cancellationToken);
        if (tenantConnection is null)
            return null;

        await using var tenantDb = TenantAuthDbContextFactory.Create(tenantConnection.BuildConnectionString());

        return await tenantDb.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Username == username, cancellationToken);
    }
}
