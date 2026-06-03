using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.Interfaces;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.Models;

namespace GSMOperations.Business.Services;

public sealed class SkuDefinitionsService : ISkuDefinitionsService
{
    private readonly IStoredProcedureExecutor _spExecutor;

    public SkuDefinitionsService(IStoredProcedureExecutor spExecutor)
    {
        _spExecutor = spExecutor;
    }

    public async Task<ApiResponse<string>> GetSkuDefinitions(CancellationToken cancellationToken)
    {
        var sp = new StoredProcedureModel
        (
            "SKUDEFINITIONS"
        );

        var json = await _spExecutor.ExecuteSpScalarAsync(sp, cancellationToken);

        if (string.IsNullOrWhiteSpace(json))
        {
            return ApiResponse<string>.FailResult(Messages.Operations.SkuDefinitionsEmpty, ErrorType.NotFound);
        }

        return ApiResponse<string>.SuccessResult(json, Messages.Operations.SkuDefinitionsLoaded);
    }
}