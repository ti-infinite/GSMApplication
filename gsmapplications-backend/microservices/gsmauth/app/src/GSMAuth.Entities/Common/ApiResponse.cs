using GSMAuth.Entities.Interfaces;

namespace GSMAuth.Entities.Common;

public sealed class ApiResponse<T> : IApiResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public ErrorType? ErrorType { get; set; }
}