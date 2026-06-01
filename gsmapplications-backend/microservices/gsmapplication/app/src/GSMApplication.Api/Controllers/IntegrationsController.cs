using GSMApplication.DataAccess.Entities;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;
using GSMApplication.Entities.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GSMApplication.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/integrations/api-rules")]
public sealed class IntegrationsController : ControllerBase
{
    private readonly IApiRulesManagementService _apiRulesManagementService;
    public IntegrationsController(IApiRulesManagementService apiRulesManagementService)
    {
        _apiRulesManagementService = apiRulesManagementService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ApiRule>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ApiRule>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddApiRule([FromBody] ApiRuleDTO apiRule, CancellationToken cancellationToken )
    {
        var response = await _apiRulesManagementService.CreateApiRule(apiRule, cancellationToken);
        return Ok(response);
    }

    [HttpPut("{idApiRule:int}")]
    [ProducesResponseType(typeof(ApiResponse<ApiRule>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ApiRule>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<ApiRule>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateApiRule(int idApiRule, [FromBody] ApiRuleDTO apiRule, CancellationToken cancellationToken )
    {
        var response = await _apiRulesManagementService.UpdateApiRule(idApiRule, apiRule, cancellationToken);
        return Ok(response);
    }

    [HttpDelete("{idApiRule:int}")]
    [ProducesResponseType(typeof(ApiResponse<ApiRule>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ApiRule>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteApiRule(int idApiRule, CancellationToken cancellationToken )
    {
        var response = await _apiRulesManagementService.DeleteApiRule(idApiRule, cancellationToken);
        return Ok(response);
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ApiRule>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllApiRules(CancellationToken cancellationToken )
    {
        var response = await _apiRulesManagementService.GetAllApiRules(cancellationToken);
        return Ok(response);
    }

    [HttpGet("{idApiRule:int}")]
    [ProducesResponseType(typeof(ApiResponse<ApiRule>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ApiRule>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetApiRuleById(int idApiRule, CancellationToken cancellationToken )
    {
        var response = await _apiRulesManagementService.GetApiRuleById(idApiRule, cancellationToken);
        return Ok(response);
    }


}