using GSMAuth.Abstractions;
using GSMAuth.Entities.Common;
using GSMAuth.Entities.DTOs;
using GSMAuth.Tenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GSMAuth.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly TenantContext _tenantContext;

    public AuthController(IAuthService authService, TenantContext tenantContext)
    {
        _authService = authService;
        _tenantContext = tenantContext;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        _tenantContext.CompanyId = request.IDCompany;
        var response = await _authService.LoginAsync(request, cancellationToken);

        if (!response.Success)
        {
            return response.ErrorType switch
            {
                ErrorType.Validation => BadRequest(response),
                ErrorType.Unauthorized => Unauthorized(response),
                ErrorType.NotFound => NotFound(response),
                _ => StatusCode(500, response)
            };
        }

        return Ok(response);
    }

}