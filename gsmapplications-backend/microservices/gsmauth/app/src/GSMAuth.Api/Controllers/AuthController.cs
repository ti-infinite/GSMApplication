using GSMAuth.Abstractions;
using GSMAuth.Entities.Common;
using GSMAuth.Entities.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GSMAuth.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<LoginDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<LoginDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<LoginDto>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<LoginDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<LoginDto>), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        var response = await _authService.LoginAsync(request, cancellationToken);

        if (response.Success && response.Data != null)
        {
            Response.Cookies.Append("gsm_token", response.Data.Token, new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Strict,
                Expires  = response.Data.ExpiresAtUtc,
                Path     = "/"
            });
        }

        return Ok(response);
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("gsm_token", new CookieOptions { Path = "/" });
        return Ok(ApiResponse<object>.SuccessResultWithoutData(Messages.Auth.LoggedOut));
    }

}