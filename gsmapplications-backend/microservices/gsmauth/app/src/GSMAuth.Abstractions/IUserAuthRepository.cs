

using GSMAuth.Entities.DTOs;

namespace GSMAuth.Abstractions;

public interface IUserAuthRepository
{
    Task<UserDTO?> GetByUsernameAsync(string companyId, string username, CancellationToken cancellationToken = default);
}
