using GSMAuth.Entities.Interfaces;

namespace GSMAuth.Entities.Common;

public sealed class ApiResponse<T> : IApiResponse
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public T? Data { get; init; }
    public ErrorType? ErrorType { get; init; }
    public string? TraceId { get; init; }
    public string? Details { get; init; }

    private ApiResponse() { }

    public static ApiResponse<T> SuccessResult(T data, string message, string? traceId = null)
        => new()
        {
            Success = true,
            Message = message,
            Data = data,
            TraceId = traceId
        };

    public static ApiResponse<T> SuccessResultWithoutData(string message, string? traceId = null)
        => new()
        {
            Success = true,
            Message = message,
            TraceId = traceId
        };

    public static ApiResponse<T> FailResult(string message, ErrorType errorType, string? traceId = null, string? details = null)
        => new()
        {
            Success = false,
            Message = message,
            ErrorType = errorType,
            TraceId = traceId,
            Details = details
        };
}