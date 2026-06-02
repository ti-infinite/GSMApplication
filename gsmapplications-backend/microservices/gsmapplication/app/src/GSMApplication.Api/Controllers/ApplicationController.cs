using GSMApplication.Abstractions;
using GSMApplication.Business.Interfaces;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace GSMApplication.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class ApplicationController : ControllerBase
{
    private readonly IMenuService _menuService;
    private readonly IMultimediaResourceService _multimediaResourceService;
    private readonly IRequestContext _requestContext;

    public ApplicationController(IMenuService menuService, IMultimediaResourceService multimediaResourceService, IRequestContext requestContext)
    {
        _menuService = menuService;
        _multimediaResourceService = multimediaResourceService;
        _requestContext = requestContext;
    }

    [HttpGet("getMenu")]
    [ProducesResponseType(typeof(ApiResponse<GetMenuDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<MultimediaResourceDto>), StatusCodes.Status401Unauthorized)]

    public async Task<IActionResult> GetMenu(CancellationToken cancellationToken)
    {
        var response = await _menuService.GetMenuAsync(_requestContext.IdProfile, cancellationToken);

        return Ok(response);
    }

    [HttpGet("getMediaResources")]
    [ProducesResponseType(typeof(ApiResponse<List<MultimediaResourceDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<MultimediaResourceDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<MultimediaResourceDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMediaResources([FromQuery] List<string> categories, CancellationToken cancellationToken)
    {
        if (categories == null || !categories.Any())
        {

            var response = ApiResponse<List<MultimediaResourceDto>>.FailResult(Messages.Application.InvalidCategories, ErrorType.Validation);

            return Ok(response);
        }
            

        var serviceResponse = await _multimediaResourceService.GetMultimediaResourceByCategory(categories, cancellationToken);

        return Ok(serviceResponse);
    }
}
