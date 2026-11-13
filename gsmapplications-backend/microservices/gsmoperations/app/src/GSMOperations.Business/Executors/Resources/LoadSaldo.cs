using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.Interfaces;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;

namespace GSMOperations.Business.Executors.Resources;

public class LoadSaldo : IResourceExecutor
{
    private readonly IStoredProcedureExecutor _spExecutor;
    public const string EventName = "LOADSALDO";
    public string ResourceEvent => EventName;

    public LoadSaldo(IStoredProcedureExecutor spExecutor)
    {
        _spExecutor = spExecutor;
    }


    public async Task<object> ExecuteAsync(Dictionary<string, object> parameters, CancellationToken cancellationToken = default)
    {
        if (!parameters.TryGetValue("trxDocument", out var trxDocumentValue))
        {
            throw new ArgumentException("Parameter 'trxDocument' is required.");
        }

        var trxDocument = trxDocumentValue?.ToString();
        if (string.IsNullOrWhiteSpace(trxDocument))
        {
            throw new ArgumentException("Parameter 'trxDocument' cannot be empty.");
        }

        var sp = new StoredProcedureModel
        (
            EventName,
            new Dictionary<string, object?>
            {
                { "@TrxDocument", trxDocument}
            }
        );

        var result = await _spExecutor.ExecuteSpAsyncWithReturn<SaldoDTO>(sp, cancellationToken);

        return result;
    }
}