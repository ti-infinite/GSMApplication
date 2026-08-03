using System.Text.Json;
using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.Entities;
using GSMOperations.DataAccess.Interfaces;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;
using GSMOperations.Entities.Models.Transactions;

namespace GSMOperations.Business.Executors.Events;

public sealed class AdjustInventory : IEventExecutor
{
    private readonly IStoredProcedureExecutor _spExecutor;
    public const string EventExecutorName = "ADJUST_INVENTORY";
    public string EventName => EventExecutorName;

    public AdjustInventory(IStoredProcedureExecutor spExecutor)
    {
        _spExecutor = spExecutor;
    }

    public async Task<EventExecutionResultDTO> ExecuteAsync(JsonReaEvents eventDefinition, TrxHeader trxRequest, CancellationToken cancellationToken = default)
    {
        try
        {
            var jsonParam = new
            {
               trxDocument = trxRequest.TrxDocument,
               codeLocation = trxRequest.Location,
               trxProducts = trxRequest.TrxProducts
                    .Select(product => new
                    {
                        idVariety = product.IdVariety,
                        varietyName = product.VarietyName,
                        sku = product.Sku,
                        qty = product.Qty
                    }).ToArray()               
            };

            var adjustJson = JsonSerializer.Serialize(jsonParam);

            var sp = new StoredProcedureModel
            (
                EventName,
                new Dictionary<string, object?>
                {
                    {"@AdjustJson", adjustJson}   
                }
            );

            var result = await _spExecutor.ExecuteSpAsyncNoReturn(sp, cancellationToken);

            return new EventExecutionResultDTO
            {
               EventName = EventExecutorName,
               Success = true,
               Message = Messages.Events.EventAdjustSuccess
            };

        }
        catch (Exception ex)
        {
            return new EventExecutionResultDTO
            {
                EventName = EventExecutorName,
                Success = false,
                Message = ex.Message
            };
        }
    }
}