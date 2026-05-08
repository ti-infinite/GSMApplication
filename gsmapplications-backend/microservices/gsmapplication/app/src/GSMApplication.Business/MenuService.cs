using GSMApplication.Abstractions;
using GSMApplication.DataAccess.StoredProcedures;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;
using GSMApplication.Entities.Models;

namespace GSMApplication.Business;

public sealed class MenuService : IMenuService
{


    private readonly IStoredProcedureExecutor _spExecutor;

    public MenuService(IStoredProcedureExecutor spExecutor)
    {
        _spExecutor = spExecutor;
    }


    public async Task<GetMenuResponseDto> GetMenuAsync(int idProfile, CancellationToken cancellationToken = default)
    {
        var sp = new StoredProcedureModel
        (
            "MENUOPTIONS",
            new Dictionary<string, object?>
            {
                { "@IDrol", idProfile }
            }
        );

        var json = await _spExecutor.ExecuteSpScalarAsync(sp, cancellationToken);


        var response = new GetMenuResponseDto
        {
            Success = true,
            Message = Messages.Application.MenuLoaded,
            IdProfile = idProfile,
            Menu = json
        };

        return response;
    }
}
