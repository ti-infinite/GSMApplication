using GSMAuth.Entities.Common;

namespace GSMAuth.Entities.DTOs;

public sealed class LoginResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Token { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public AuthenticatedUserDto? User { get; set; }
    public ErrorType? ErrorType { get; set; }
}
