namespace GSMApplication.Entities.DTOs;

public sealed class LocationDTO
{
    public required int IdLocation { get; set; }
    public string IdThirdLocation { get; set; } = null!;
    public string CodeLocation { get; set; } = null!;
    public string? Descr { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? AddressLocation { get; set; }

}