using Microsoft.AspNetCore.Mvc;

namespace GSMOperations.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class OperationsController : ControllerBase
{
    public OperationsController() 
    { 

    }

    [HttpGet("parameters")]
    public Task<IActionResult> GetParameters(CancellationToken cancellationToken)
    {

        return Task.FromResult<IActionResult>(Ok());
    }

    [HttpGet("categories")]
    public Task<IActionResult> GetCategories(CancellationToken cancellationToken)
    {
        return Task.FromResult<IActionResult>(Ok());
    }


}
