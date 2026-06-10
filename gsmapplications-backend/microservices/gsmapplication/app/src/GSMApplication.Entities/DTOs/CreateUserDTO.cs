namespace GSMApplication.Entities.DTOs;

public sealed class CreateUserDTO
{
    public required string Username { get; set; }
    public required string FirstName { get; set; }
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public string Email { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public required int IdProfile { get; set; }
    public string Location { get; set; } = string.Empty;
    public required string Password { get; set; }
    
}