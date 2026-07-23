using GSMOperations.DataAccess.Entities;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models.Transactions;

namespace GSMOperations.Business.Interfaces;

public interface IEventExecutor
{
    string EventName { get; }
    Task<EventExecutionResultDTO> ExecuteAsync(JsonReaEvents eventDefinition, TrxHeader trxRequest, CancellationToken cancellationToken = default);
}