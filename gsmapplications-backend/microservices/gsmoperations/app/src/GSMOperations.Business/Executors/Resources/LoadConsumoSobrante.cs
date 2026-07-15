using GSMOperations.Business.Interfaces;
using GSMOperations.Entities.Common;

namespace GSMOperations.Business.Executors.Resources;

public class LoadConsumoSobrante : IResourceExecutor
{
    public string ResourceEvent => "LOADCS";
    public async Task<ApiResponse<object>> ExecuteAsync(Dictionary<string, object> parameters, CancellationToken cancellationToken = default)
    {
        var location = parameters["location"]?.ToString();

        return ApiResponse<object>.SuccessResultWithoutData("Todo bien");

    }
}