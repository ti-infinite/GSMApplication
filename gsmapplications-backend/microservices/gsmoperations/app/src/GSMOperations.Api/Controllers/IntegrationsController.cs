using GSMOperations.Business.Interfaces;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace GSMOperations.Api.Controllers;

[ApiController]
[Route("api/v1/integrations")]
public sealed class IntegrationsController : ControllerBase
{
    private readonly IApiManagementService _apiManagementService;
    public IntegrationsController (IApiManagementService apiManagementService)
    {
        _apiManagementService = apiManagementService;
    }

    [HttpPost("exec-api")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status500InternalServerError)]

    public async Task<IActionResult> ExecApi([FromBody] GenericApiDTO genericApiDTO, CancellationToken cancellationToken)
    {
        var response = await _apiManagementService.ExecApi(genericApiDTO, cancellationToken);
        return Ok(response);
    }

}
