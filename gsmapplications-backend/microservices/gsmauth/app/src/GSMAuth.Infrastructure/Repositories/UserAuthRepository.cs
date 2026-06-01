using GSMAuth.Entities.DTOs;
using GSMAuth.Abstractions;
using GSMAuth.DataAccess.ContextFactory;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel;

namespace GSMAuth.Infrastructure.Repositories;

public sealed class UserAuthRepository : IUserAuthRepository
{
    private readonly ITenantConnectionResolver _tenantConnectionResolver;

    public UserAuthRepository(ITenantConnectionResolver tenantConnectionResolver)
    {
        _tenantConnectionResolver = tenantConnectionResolver;
    }

    public async Task<UserDTO?> GetByUsernameAsync(string companyId, string username, CancellationToken cancellationToken = default)
    {
        var tenantConnection = await _tenantConnectionResolver.ResolveAsync(companyId, cancellationToken);

        if (tenantConnection is null)
            return null;

        await using var tenantDb = TenantAuthDbContextFactory.Create(tenantConnection.BuildConnectionString());

        var user = await tenantDb.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Username == username,
                cancellationToken);

        return user is null
            ? null
            : new UserDTO
            {
                IdUser = user.IdUser,
                Username = user.Username,
                PasswordHash = user.PasswordHash,
                IsActive = user.IsActive,
                FullName = user.FullName,
                Email = user.Email,
                IdProfile = user.IdProfile,
                PasswordChangeRequired = user.PasswordChangeRequired,
                Location = user.Location,
                Department = user.Department
            };
    }

    public async Task UpdateLastLoginAsync(string companyId, Guid idUser, DateTime lastLoginDateUtc, CancellationToken cancellationToken = default)
    {
        var tenantConnection = await _tenantConnectionResolver.ResolveAsync(companyId, cancellationToken);

        if (tenantConnection is null)
            return;

        await using var tenantDb = TenantAuthDbContextFactory.Create(tenantConnection.BuildConnectionString());

        var user = await tenantDb.Users.FindAsync(new object[] { idUser }, cancellationToken);

        if (user is null)
            return;

        user.LastSessionDate = lastLoginDateUtc;

        await tenantDb.SaveChangesAsync(cancellationToken);
    }
}