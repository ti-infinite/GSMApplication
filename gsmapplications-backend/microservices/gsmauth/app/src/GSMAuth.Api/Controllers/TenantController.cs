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
    [ProducesResponseType(typeof(TenantResolveResponseDto), 200)]
    [ProducesResponseType(typeof(TenantResolveResponseDto), 400)]
    public async Task<IActionResult> Resolve([FromBody] TenantResolveRequestDto request, CancellationToken cancellationToken)
    {
        var companyId = request.IDCompany.Trim();

        var tenant = await _tenantResolver.ResolveAsync(companyId, cancellationToken);

        if (tenant is null)
        {
            return Ok(new TenantResolveResponseDto
            {
                TenantExists = false,
                Message = Messages.Tenant.TenantInvalid
            });
        }
        var jsonStyles = await _tenantConfig.GetJsonStylesAsync(companyId, cancellationToken);

        return Ok(new TenantResolveResponseDto
        {
            TenantExists = true,
            Message = Messages.Tenant.TenantValid,
            JsonStyles = jsonStyles
        });

    }
}