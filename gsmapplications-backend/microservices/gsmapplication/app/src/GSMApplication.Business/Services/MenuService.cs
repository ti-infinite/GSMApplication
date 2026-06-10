using GSMApplication.Abstractions;
using GSMApplication.DataAccess.Interfaces;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;
using GSMApplication.Entities.Models;

namespace GSMApplication.Business.Services;

public sealed class MenuService : IMenuService
{
    private readonly IStoredProcedureExecutor _spExecutor;

    public MenuService(IStoredProcedureExecutor spExecutor)
    {
        _spExecutor = spExecutor;
    }

    public async Task<ApiResponse<GetMenuDto>> GetMenuAsync(int idProfile, CancellationToken cancellationToken = default)
    {
        var sp = new StoredProcedureModel
        (
            "MENUOPTIONS",
            new Dictionary<string, object?>
            {
                { "@IDrol", idProfile }
            }
        );

        var json = await _spExecutor.ExecuteSpScalarAsync<string?>(sp, cancellationToken);

        if (string.IsNullOrWhiteSpace(json))
        {
            return ApiResponse<GetMenuDto>.FailResult(Messages.Application.MenuEmpty, ErrorType.NotFound);
        }


        return ApiResponse<GetMenuDto>.SuccessResult(
            new GetMenuDto
            {
                IdProfile = idProfile,
                Menu = json
            },
            Messages.Application.MenuLoaded
        );

    }


}
