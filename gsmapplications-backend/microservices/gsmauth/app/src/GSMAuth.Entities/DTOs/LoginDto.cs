using GSMAuth.Entities.Common;

namespace GSMAuth.Entities.DTOs;

public sealed class LoginDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public AuthenticatedUserDto User { get; set; } = default!;
}
