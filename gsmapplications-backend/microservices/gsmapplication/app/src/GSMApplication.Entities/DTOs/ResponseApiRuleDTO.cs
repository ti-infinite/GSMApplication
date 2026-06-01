namespace GSMApplication.Entities.DTOs;

public sealed class ResponseApiRuleDTO
{
    public int IdApi { get; set; }
    public string ShortName { get; set; } = string.Empty;
    public string? Descr { get; set; }
    public string UrlEndPoint { get; set; } = string.Empty;
    public string Operation { get; set; } = string.Empty;
}