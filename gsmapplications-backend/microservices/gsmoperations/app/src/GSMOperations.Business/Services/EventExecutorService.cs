using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.Entities;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;

namespace GSMOperations.Business.Services;

public sealed class EventExecutorService : IEventExecutorService
{
    private readonly Dictionary<string, IEventExecutor> _executors;

    public EventExecutorService(IEnumerable<IEventExecutor> executors)
    {
        _executors = executors.ToDictionary(x => x.EventName, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<List<EventExecutionResultDTO>> ExecuteAsync(IEnumerable<JsonReaEvents> events, TrxHeader trxRequest, CancellationToken cancellationToken)
    {
        var results = new List<EventExecutionResultDTO>();
        foreach (var eventDefinition in events)
        {
            if (!_executors.TryGetValue(eventDefinition.Id, out var executor))
            {
                results.Add(new EventExecutionResultDTO
                {
                    EventName = eventDefinition.Id,
                    Success = false,
                    Message = $"Event '{eventDefinition.Id}' not found."
                });

                continue;
            }
            try
            {
                var result = await executor.ExecuteAsync(eventDefinition, trxRequest, cancellationToken);
                results.Add(result);

            }
            catch (Exception ex)
            {
                results.Add(new EventExecutionResultDTO
                {
                    EventName = eventDefinition.Id,
                    Success = false,
                    Message = ex.Message
                });
            }
        }
        return results;
    }
}