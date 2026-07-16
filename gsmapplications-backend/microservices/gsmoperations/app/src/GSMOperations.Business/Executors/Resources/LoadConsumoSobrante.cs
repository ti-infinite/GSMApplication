using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.Interfaces;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;

namespace GSMOperations.Business.Executors.Resources;

public class LoadConsumoSobrante : IResourceExecutor
{
    private readonly IStoredProcedureExecutor _spExecutor;
    public const string EventName = "LOADCS";
    public string ResourceEvent => EventName;

    public LoadConsumoSobrante(IStoredProcedureExecutor spExecutor)
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

        var result = await _spExecutor.ExecuteSpAsyncWithReturn<InventoryCsDTO>(sp, cancellationToken);

        return result;

    }
}