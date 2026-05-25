using GSMApplication.Abstractions;
using GSMApplication.Business.Interfaces;
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
    private readonly IMultimediaResourceService _multimediaResourceService;

    public ApplicationController(IMenuService menuService, IMultimediaResourceService multimediaResourceService)
    {
        _menuService = menuService;
        _multimediaResourceService = multimediaResourceService;
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

    [Authorize]
    [HttpGet("getMediaResources")]
    public async Task<IActionResult> GetMediaResources([FromQuery] List<string> categories, CancellationToken cancellationToken)
    {
        if (categories == null || !categories.Any())
        {
            return BadRequest("Categories cannot be empty");
        }
            
        var response = await _multimediaResourceService.GetMultimediaResourceByCategory(categories, cancellationToken);

        return Ok(response);
    }
}
