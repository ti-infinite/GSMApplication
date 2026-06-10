using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.Interfaces;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.Models;

namespace GSMOperations.Business.Services;

public sealed class CategoriesService : ICategoriesService
{
    private readonly IStoredProcedureExecutor _spExecutor;

    public CategoriesService(IStoredProcedureExecutor spExecutor)
    {
        _spExecutor = spExecutor;
    }

    public async Task<ApiResponse<string>> GetCategories(CancellationToken cancellationToken)
    {
        var sp = new StoredProcedureModel
        (
            "CATEGORIES"
        );

        var json = await _spExecutor.ExecuteSpScalarAsync<string?>(sp, cancellationToken);

        if (string.IsNullOrWhiteSpace(json))
        {
            return ApiResponse<string>.FailResult(Messages.Operations.CategoriesEmpty, ErrorType.NotFound);
        }

        return ApiResponse<string>.SuccessResult(json, Messages.Operations.CategoriesLoaded);
    }
}