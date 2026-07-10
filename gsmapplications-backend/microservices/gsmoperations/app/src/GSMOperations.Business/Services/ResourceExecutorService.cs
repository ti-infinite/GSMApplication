using GSMOperations.Business.Interfaces;
using GSMOperations.Entities.Common;

namespace GSMOperations.Business.Services;

public sealed class ResourceExecutorService : IResourceExecutorService
{
    private readonly Dictionary<string, IResourceExecutor> _executors;

    public ResourceExecutorService(IEnumerable<IResourceExecutor> executors)
    {
        _executors = executors.ToDictionary(x => x.ResourceEvent, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<ApiResponse<object>> ExecuteAsync(string resourceEvent, Dictionary<string, object> parameters, CancellationToken cancellationToken = default)
    {
        
        if (!_executors.TryGetValue(resourceEvent, out var executor))
        {
            return ApiResponse<object>.FailResult($"Resource '{resourceEvent}' not found.",ErrorType.NotFound);
        }

        var response = await executor.ExecuteAsync(parameters, cancellationToken);
        return ApiResponse<object>.SuccessResult(response, Messages.Operations.ApiExecutedSuccessfully);
    }
}