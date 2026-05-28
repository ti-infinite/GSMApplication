namespace GSMApplication.Entities.DTOs;

public sealed class ApiRuleDTO
{
    public required string ShortName { get; set; }
    public string? Descr { get; set; } = string.Empty;
    public required string UrlEndPoint { get; set; }
    public required string Operation { get; set; }
}