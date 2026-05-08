using System.Security.Claims;
using GSMApplication.Abstractions;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GSMApplication.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class ApplicationController : ControllerBase
{
    private readonly IMenuService _menuService;

    public ApplicationController(IMenuService menuService)
    {
        _menuService = menuService;
    }

    [Authorize]
    [HttpGet("getMenu")]
    [ProducesResponseType(typeof(GetMenuResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(GetMenuResponseDto), StatusCodes.Status401Unauthorized)]

    public async Task<IActionResult> GetMenu(CancellationToken cancellationToken)
    {
        var idProfileValue = User.FindFirst("idProfile")?.Value;

        if (!int.TryParse(idProfileValue, out var idProfile))
        {
            return Unauthorized(new GetMenuResponseDto
            {
                Success = false,
                Message = Messages.Application.InvalidToken,
                ErrorType = ErrorType.Unauthorized,
                Menu = string.Empty
            });
        }

        var response = await _menuService.GetMenuAsync(idProfile, cancellationToken);

        return Ok(response);
    }

}
