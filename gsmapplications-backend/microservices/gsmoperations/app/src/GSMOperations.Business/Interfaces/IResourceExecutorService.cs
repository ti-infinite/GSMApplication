using GSMOperations.Entities.Common;

namespace GSMOperations.Business.Interfaces;

public interface IResourceExecutorService
{
    Task<ApiResponse<object>> ExecuteAsync(string resourceEvent, Dictionary<string, object> parameters, CancellationToken cancellationToken);
}