using System.ComponentModel.DataAnnotations;

namespace GSMGateway.Entities.Security;

public sealed class JwtSettingsOptions
{
    [Required]
    public string Issuer { get; set; } = null!;
    [Required]
    public string Audience { get; set; } = null!;
    [Required]
    public string SecretKey { get; set; } = null!;
}
