namespace GSMApplication.Entities.DTOs;

public sealed class LocationDTO
{
    public required int IdLocation { get; set; }
    public required int IdThirdLocation { get; set; }
    public string CodeLocation { get; set; } = null!;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? AddressLocation { get; set; }

}