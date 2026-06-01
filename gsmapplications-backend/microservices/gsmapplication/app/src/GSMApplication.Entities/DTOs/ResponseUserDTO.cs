namespace GSMApplication.Entities.DTOs;

public sealed class ResponseUserDTO
{
    public required string Username { get; set; }
    public required string FullName { get; set; } = null!;
    public required int IdProfile { get; set; }
    public string Location { get; set; } = null!;
}