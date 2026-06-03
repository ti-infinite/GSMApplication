using GSMOperations.Entities.Common;

namespace GSMOperations.Business.Interfaces;

public interface ISkuDefinitionsService
{
    Task<ApiResponse<string>> GetSkuDefinitions(CancellationToken cancellationToken);
}