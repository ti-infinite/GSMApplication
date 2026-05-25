using GSMAuth.Entities.Common;
using GSMAuth.Entities.DTOs;

namespace GSMAuth.Abstractions;

public interface IAuthService
{
    Task<ApiResponse<LoginDto>> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
}
