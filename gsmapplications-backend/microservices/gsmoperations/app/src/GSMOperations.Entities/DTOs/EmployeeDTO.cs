namespace GSMOperations.Entities.DTOs;

public sealed class EmployeeDTO
{
    public required int IdEmployee { get; set; }
    public string FullName { get; set; } = null!;
    public string? Location { get; set; }
    public string? ContactNumber { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; }
}