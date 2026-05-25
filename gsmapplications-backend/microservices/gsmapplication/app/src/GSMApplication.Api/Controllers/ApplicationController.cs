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
    [ProducesResponseType(typeof(ApiResponse<GetMenuDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<GetMenuDto>), StatusCodes.Status401Unauthorized)]

    public async Task<IActionResult> GetMenu(CancellationToken cancellationToken)
    {
        var idProfileValue = User.FindFirst("idProfile")?.Value;

        if (!int.TryParse(idProfileValue, out var idProfile))
        {
            return Ok(ApiResponse<GetMenuDto>.FailResponse(Messages.Application.InvalidToken, ErrorType.Unauthorized));
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
            return Ok(ApiResponse<List<MultimediaResourceDto>>.FailResponse(Messages.Application.InvalidCategories, ErrorType.Validation));
        }
            
        var response = await _multimediaResourceService.GetMultimediaResourceByCategory(categories, cancellationToken);

        return Ok(response);
    }
}
