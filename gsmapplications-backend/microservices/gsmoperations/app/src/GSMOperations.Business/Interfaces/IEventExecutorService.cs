using GSMOperations.DataAccess.Entities;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models.Transactions;

public interface IEventExecutorService
{
    Task<List<EventExecutionResultDTO>> ExecuteAsync(IEnumerable<JsonReaEvents> eventName, TrxHeader trxRequest, CancellationToken cancellationToken = default);

}