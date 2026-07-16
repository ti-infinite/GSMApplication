using GSMApplication.Abstractions;
using GSMApplication.Business.Interfaces;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;
using GSMApplication.Entities.Models;
using Microsoft.AspNetCore.Mvc;

namespace GSMApplication.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class ApplicationController : ControllerBase
{
    private readonly IMenuService _menuService;
    private readonly IMultimediaResourceService _multimediaResourceService;
    private readonly ILocationService _locationService;
    private readonly IRequestContext _requestContext;

    public ApplicationController(IMenuService menuService, IMultimediaResourceService multimediaResourceService, IRequestContext requestContext,
        ILocationService locationService)
    {
        _menuService = menuService;
        _multimediaResourceService = multimediaResourceService;
        _requestContext = requestContext;
        _locationService = locationService;
    }

    [HttpGet("menu")]
    [ProducesResponseType(typeof(ApiResponse<GetMenuDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<GetMenuDto>), StatusCodes.Status401Unauthorized)]

    public async Task<IActionResult> GetMenu(CancellationToken cancellationToken)
    {
        var response = await _menuService.GetMenuAsync(_requestContext.IdProfile, cancellationToken);

        return Ok(response);
    }

    [HttpGet("mediaResources")]
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

    [HttpGet("filtered-locations")]
    [ProducesResponseType(typeof(ApiResponse<List<LocationDTO>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFilteredLocations([FromQuery] SearchLocation? searchCriteria, CancellationToken cancellationToken)
    {
        var response = await _locationService.GetLocations(searchCriteria, cancellationToken);
        return Ok(response);
    }
}
