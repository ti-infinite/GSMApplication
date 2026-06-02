using GSMApplication.Business.Interfaces;
using GSMApplication.Entities.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace GSMApplication.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
public sealed class UsersController : ControllerBase
{
    private readonly IUsersManagementService _usersManagementService;
    public UsersController(IUsersManagementService usersManagementService)
    {
        _usersManagementService = usersManagementService; 
    }

    [HttpPut("{idUser:guid}/password")]
    public async Task<IActionResult> UpdateUserPassword([FromRoute] Guid idUser, [FromBody] UpdateUserPasswordDTO userPasswordUpdated, CancellationToken cancellationToken)
    {
        var result = await _usersManagementService.UpdateUserPassword(idUser, userPasswordUpdated, cancellationToken);

        return Ok(result);
    }



}