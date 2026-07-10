using GSMOperations.Entities.Common;

namespace GSMOperations.Business.Interfaces;

public interface IResourceExecutor
{
    string ResourceEvent { get; }
    Task<ApiResponse<object>> ExecuteAsync(Dictionary<string, object> parameters, CancellationToken cancellationToken);
}