

using GSMAuth.Entities.DTOs;

namespace GSMAuth.Abstractions;

public interface IUserAuthRepository
{
    Task<UserDTO?> GetByUsernameAsync(string companyId, string username, CancellationToken cancellationToken = default);
    Task UpdateLastLoginAsync(string companyId, Guid idUser, DateTime lastLoginDateUtc, CancellationToken cancellationToken = default);
}
