using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.Interfaces;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;

namespace GSMOperations.Business.Executors.Resources;

public sealed class LoadSobrante : IResourceExecutor
{
    private readonly IStoredProcedureExecutor _spExecutor;
    public const string EventName = "LOADS";
    public string ResourceEvent => EventName;

    public LoadSobrante(IStoredProcedureExecutor spExecutor)
    {
        _spExecutor = spExecutor;
    }

    public async Task<object> ExecuteAsync(Dictionary<string, object> parameters, CancellationToken cancellationToken)
    {
        if (!parameters.TryGetValue("location", out var locationValue))
        {
            throw new ArgumentException("Parameter 'location' is required.");
        }

        var location = locationValue?.ToString();

        if (string.IsNullOrWhiteSpace(location))
        { 
            throw new ArgumentException("Parameter 'location' cannot be empty.");
        }

        var sp = new StoredProcedureModel
        (
            EventName,
            new Dictionary<string, object?>
            {
                { "@Location", location}
            }  
        );

        var result = await _spExecutor.ExecuteSpAsyncWithReturn<InventorySDTO>(sp, cancellationToken);

        return result;
    }
}