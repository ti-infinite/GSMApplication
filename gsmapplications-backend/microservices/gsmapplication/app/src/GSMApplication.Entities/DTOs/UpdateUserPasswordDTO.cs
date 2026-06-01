namespace GSMApplication.Entities.DTOs;

public sealed class UpdateUserPasswordDTO
{
    public required string OldPassword { get; set; }
    public required string NewPassword { get; set; }
}