using GSMAuth.Entities.DTOs;

namespace GSMAuth.Abstractions;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
}
