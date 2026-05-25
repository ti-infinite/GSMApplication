namespace GSMApplication.Entities.DTOs;

public sealed class GetMenuDto
{
    public int? IdProfile { get; set; }
    public string Menu { get; set; } = string.Empty;
}