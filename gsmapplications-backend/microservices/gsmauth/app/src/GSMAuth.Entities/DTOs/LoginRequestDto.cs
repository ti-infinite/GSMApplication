using System.ComponentModel.DataAnnotations;

namespace GSMAuth.Entities.DTOs;

public sealed class LoginRequestDto
{
    [Required]
    public string IDCompany { get; set; } = string.Empty;
    [Required]
    public string User { get; set; } = string.Empty;
    [Required]
    public string Password { get; set; } = string.Empty;
}
