namespace GSMAuth.Entities.DTOs;

public sealed class UserDTO
{
    public required Guid IdUser { get; set; }
    public required string Username { get; set; }
    public required string FullName { get; set; }
    public string Email { get; set; } = null!;
    public required int IdProfile { get; set; }
    public required string PasswordHash { get; set; }
    public required bool IsActive { get; set; }
    public required bool PasswordChangeRequired { get; set; }
    public string Department { get; set; } = string.Empty;
    public string? Location { get; set; }
}