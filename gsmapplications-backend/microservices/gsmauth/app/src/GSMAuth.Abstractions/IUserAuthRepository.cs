using GSMAuth.Entities.Models;

namespace GSMAuth.Abstractions;

public interface IUserAuthRepository
{
    Task<User?> GetByUsernameAsync(string companyId, string username, CancellationToken cancellationToken = default);
}
