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
    [ProducesResponseType(typeof(ApiResponse<TenantResolveDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<TenantResolveDto>), 400)]
    [ProducesResponseType(typeof(ApiResponse<TenantResolveDto>), 404)]
    public async Task<IActionResult> Resolve([FromBody] TenantResolveRequestDto request, CancellationToken cancellationToken)
    {
        var companyId = request.IDCompany?.Trim();

        if (string.IsNullOrWhiteSpace(companyId))
        {
            return Ok(ApiResponse<TenantResolveDto>.FailResponse(Messages.Tenant.TenantInvalid, ErrorType.Validation));
        }

        var tenant = await _tenantResolver.ResolveAsync(companyId, cancellationToken);

        if (tenant is null)
        {
            return Ok(ApiResponse<TenantResolveDto>.FailResponse(Messages.Tenant.TenantInvalid, ErrorType.NotFound));
        }

        var jsonStyles = await _tenantConfig.GetJsonStylesAsync(companyId, cancellationToken);

        return Ok(ApiResponse<TenantResolveDto>.SuccessResponse(
            new TenantResolveDto
            {
                TenantExists = true,
                JsonStyles = jsonStyles
            },
            Messages.Tenant.TenantValid
        ));
    }
}