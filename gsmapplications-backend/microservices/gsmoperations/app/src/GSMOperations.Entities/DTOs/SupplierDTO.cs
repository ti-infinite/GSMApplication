namespace GSMOperations.Entities.DTOs;

public sealed class SupplierDTO
{
    public Guid IdSupplier { get; set; }
    public string IdThirdSupplier { get; set; } = null!;
    public string NameSupplier { get; set; } = null!;
    public string CategorySupplier { get; set; } = null!;
    public string? Region { get; set; }
    public string Country { get; set; } = null!;
    public string? Contact { get; set; }
    public bool IsActive { get; set; }
}