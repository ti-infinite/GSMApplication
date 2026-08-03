namespace GSMApplication.Entities.DTOs;

public sealed class GetMenuDTO
{
    public int? IdProfile { get; set; }
    public string Menu { get; set; } = string.Empty;
}