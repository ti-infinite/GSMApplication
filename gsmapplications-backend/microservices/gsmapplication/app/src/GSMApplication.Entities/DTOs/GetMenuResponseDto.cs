using GSMApplication.Entities.Common;

namespace GSMApplication.Entities.DTOs;

public sealed class GetMenuResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int? IdProfile { get; set; }
    public string Menu { get; set; } = string.Empty;
    public ErrorType? ErrorType { get; set; }
}
