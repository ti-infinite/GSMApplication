using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GSMAuth.Api.Middleware
{
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

        public async Task InvokeAsync(HttpContext httpContext)
        {
            try
            {
                await _next(httpContext);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception occurred.");
                await HandleExceptionAsync(httpContext, ex);
            }
        }

        private Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.Clear();

            int statusCode = (int)HttpStatusCode.InternalServerError;
            string message = "An unexpected error occurred.";


            switch (exception)
            {
                case ArgumentNullException:
                    statusCode = StatusCodes.Status400BadRequest;
                    message = "Missing required parameter.";
                    break;

                case UnauthorizedAccessException:
                    statusCode = StatusCodes.Status401Unauthorized;
                    message = "Access is denied.";
                    break;

                case TaskCanceledException:
                    statusCode = 499;
                    message = "Request was cancelled.";
                    break;
            }

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = statusCode;

            var errorDetails = new
            {
                statusCode = context.Response.StatusCode,
                message = message,
                errorType  = _env.IsDevelopment() ? exception.StackTrace : null
            };

            return context.Response.WriteAsJsonAsync(errorDetails);
        }




    }
}