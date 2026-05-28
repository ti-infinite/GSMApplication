using GSMAuth.Abstractions;
using GSMAuth.Entities.Common;
using GSMAuth.Entities.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace GSMAuth.Api.Controllers;

[ApiController]
[Route("api/v1/tenant")]
public sealed class TenantController : ControllerBase
{
    private readonly ITenantConnectionResolver _tenantResolver;
    private readonly ITenantConfigurationService _tenantConfig;

    public TenantController(ITenantConnectionResolver tenantResolver, ITenantConfigurationService tenantConfig)
    {
        _tenantResolver = tenantResolver;
        _tenantConfig = tenantConfig;
    }

    [HttpPost("resolve")]
    [ProducesResponseType(typeof(ApiResponse<TenantResolveDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<TenantResolveDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<TenantResolveDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Resolve([FromBody] TenantResolveRequestDto request, CancellationToken cancellationToken)
    {
        var companyId = request?.IDCompany?.Trim();

        if (string.IsNullOrWhiteSpace(companyId))
        {
 
            var response = ApiResponse<TenantResolveDto>.FailResult(Messages.Tenant.TenantInvalid, ErrorType.Validation);

            return Ok(response);
        }

        var tenant = await _tenantResolver.ResolveAsync(companyId, cancellationToken);

        if (tenant is null)
        {
            var response = ApiResponse<TenantResolveDto>.FailResult(Messages.Tenant.TenantInvalid, ErrorType.NotFound);

            return Ok(response);
        }

        var jsonStyles = await _tenantConfig.GetJsonStylesAsync(companyId, cancellationToken);

        var successResponse = ApiResponse<TenantResolveDto>.SuccessResult(
            new TenantResolveDto
            {
                TenantExists = true,
                JsonStyles = jsonStyles
            },
            Messages.Tenant.TenantValid
        );

        return Ok(successResponse);

    }
}