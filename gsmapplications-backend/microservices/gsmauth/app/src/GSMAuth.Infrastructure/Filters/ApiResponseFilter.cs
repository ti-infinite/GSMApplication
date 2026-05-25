using GSMAuth.Entities.Common;
using GSMAuth.Entities.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GSMAuth.Infrastructure.Filters;

public sealed class ApiResponseFilter : IActionFilter
{

    public void OnActionExecuting(ActionExecutingContext context)
    {
    }
    public void OnActionExecuted(ActionExecutedContext context)
    {
        if (context.Result is ObjectResult objectResult)
        {
            if (objectResult.Value is IApiResponse response)
            {
                if (!response.Success)
                {
                    context.Result = response.ErrorType switch
                    {
                        ErrorType.Validation => new BadRequestObjectResult(response),
                        ErrorType.BadRequest => new BadRequestObjectResult(response),
                        ErrorType.Unauthorized => new UnauthorizedObjectResult(response),
                        ErrorType.NotFound => new NotFoundObjectResult(response),
                        ErrorType.Conflict => new ConflictObjectResult(response),
                        _ => new ObjectResult(response)
                        {
                            StatusCode = StatusCodes.Status500InternalServerError
                        }
                    };
                }
                else
                {
                    objectResult.StatusCode = StatusCodes.Status200OK;
                }
            }
        }
    }
}
