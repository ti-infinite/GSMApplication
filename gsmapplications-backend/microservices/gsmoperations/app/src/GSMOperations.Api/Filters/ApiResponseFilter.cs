using GSMOperations.Entities.Common;
using GSMOperations.Entities.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GSMOperations.Api.Filters;

public sealed class ApiResponseFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        if (context.Result is not ObjectResult objectResult)
            return;

        if (objectResult.Value is not IApiResponse response)
            return;

        if (response.Success)
            return;

        context.Result = response.ErrorType switch
        {
            ErrorType.Validation => new BadRequestObjectResult(response),

            ErrorType.BadRequest => new BadRequestObjectResult(response),

            ErrorType.Unauthorized => new UnauthorizedObjectResult(response),

            ErrorType.Forbidden => new ObjectResult(response)
            {
                StatusCode = StatusCodes.Status403Forbidden
            },

            ErrorType.NotFound => new NotFoundObjectResult(response),

            ErrorType.Conflict => new ConflictObjectResult(response),

            _ => new ObjectResult(response)
            {
                StatusCode = StatusCodes.Status500InternalServerError
            }
        };
    }
}

