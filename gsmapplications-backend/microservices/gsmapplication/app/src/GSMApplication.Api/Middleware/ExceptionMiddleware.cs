using GSMApplication.Entities.Common;

namespace GSMApplication.Api.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var traceId = context.TraceIdentifier;

            _logger.LogError(
                ex,
                "Unhandled exception at {Method} {Path} | TraceId: {TraceId}",
                context.Request.Method,
                context.Request.Path,
                traceId
            );

            await HandleExceptionAsync(context, ex, traceId);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception, string traceId)
    {
        if (context.Response.HasStarted)
        {
            _logger.LogWarning("Response already started. Cannot handle exception. TraceId: {TraceId}", traceId);
            return;
        }

        context.Response.Clear();

        var (statusCode, message, errorType) = exception switch
        {
            ArgumentNullException ex => (StatusCodes.Status400BadRequest, ex.Message, ErrorType.Validation),

            ArgumentException ex => (StatusCodes.Status400BadRequest, ex.Message, ErrorType.Validation),

            UnauthorizedAccessException ex => (StatusCodes.Status401Unauthorized, ex.Message, ErrorType.Unauthorized),

            OperationCanceledException when context.RequestAborted.IsCancellationRequested => 
            (StatusCodes.Status408RequestTimeout, "Request was cancelled.", ErrorType.Internal),

            TaskCanceledException => (StatusCodes.Status408RequestTimeout, "Request timeout.", ErrorType.Internal),

            KeyNotFoundException ex => (StatusCodes.Status404NotFound, ex.Message, ErrorType.NotFound),

            InvalidOperationException  ex => (StatusCodes.Status404NotFound, ex.Message, ErrorType.NotFound),

            _ => (
                StatusCodes.Status500InternalServerError,
                "Unexpected error.",
                ErrorType.Internal
            )
        };

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = ApiResponse<object>.FailResult(
            message,
            errorType,
            traceId,                                              // siempre: el TraceId no es sensible y permite correlacionar con los logs
            _env.IsDevelopment() ? exception.ToString() : null   // details (stack) solo en dev
        );

        await context.Response.WriteAsJsonAsync(response);
    }
}
