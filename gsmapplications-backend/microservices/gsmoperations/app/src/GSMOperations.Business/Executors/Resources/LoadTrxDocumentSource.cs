using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.Interfaces;
using GSMOperations.Entities.Models;

namespace GSMOperations.Business.Executors.Resources;

public sealed class LoadTrxDocumentSource : IResourceExecutor
{
    private readonly IStoredProcedureExecutor _spExecutor;
    public const string EventName = "LOADMISSINGTRX";
    public string ResourceEvent => EventName;
    public LoadTrxDocumentSource (IStoredProcedureExecutor spExecutor)
    {
        _spExecutor = spExecutor;
    } 

    public async Task<object> ExecuteAsync(Dictionary<string, object> parameters, CancellationToken cancellationToken)
    {
        if (!parameters.TryGetValue("location", out var locationValue) || 
            !parameters.TryGetValue("trxPrefixSource", out var prefixSourceValue) ||
            !parameters.TryGetValue("trxPrefixRelative", out var prefixRelativeValue))
        {
            throw new ArgumentException("There are missing parameters.");
        }

        var location = locationValue?.ToString();
        var prefixSource = prefixSourceValue?.ToString();
        var prefixRelative = prefixRelativeValue?.ToString();

        if (string.IsNullOrWhiteSpace(location) ||
            string.IsNullOrWhiteSpace(prefixSource) ||
            string.IsNullOrWhiteSpace(prefixRelative))
        {
            throw new ArgumentException("No parameter can be empty.");
        }

        var sp = new StoredProcedureModel
        (
            EventName,
            new Dictionary<string, object?>
            {
                { "@TrxPrefixSource", prefixSource},
                { "@TrxPrefixRelative", prefixRelative},
                { "@Location", location}
            }
        );

        var result = await _spExecutor.ExecuteSpAsyncWithReturn<List<string>>(sp, cancellationToken);

        return result;
    }
}