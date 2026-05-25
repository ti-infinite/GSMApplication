using GSMApplication.Entities.Interfaces;

namespace GSMApplication.Entities.Common;

public sealed class ApiResponse<T> : IApiResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public ErrorType? ErrorType { get; set; }
    public static ApiResponse<T> SuccessResponse(T data, string message)
        => new()
        {
            Success = true,
            Message = message,
            Data = data
        };

    public static ApiResponse<T> FailResponse(string message, ErrorType errorType)
        => new()
        {
            Success = false,
            Message = message,
            ErrorType = errorType
        };
}