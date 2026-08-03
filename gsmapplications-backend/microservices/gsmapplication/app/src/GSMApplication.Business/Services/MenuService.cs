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

    public async Task<ApiResponse<GetMenuDTO>> GetMenuAsync(int idProfile, CancellationToken cancellationToken = default)
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
            return ApiResponse<GetMenuDTO>.FailResult(Messages.Application.MenuEmpty, ErrorType.NotFound);
        }


        return ApiResponse<GetMenuDTO>.SuccessResult(
            new GetMenuDTO
            {
                IdProfile = idProfile,
                Menu = json
            },
            Messages.Application.MenuLoaded
        );

    }


}
