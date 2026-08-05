using System.Text.Json;
using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.ContextDb;
using GSMOperations.DataAccess.Entities;
using GSMOperations.DataAccess.Interfaces;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;
using GSMOperations.Entities.Models.Transactions;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.Business.Services;

public sealed class ManageTransactionService : IManageTransactionService
{
    private readonly IStoredProcedureExecutor _spExecutor;
    private readonly IEventExecutorService _eventExecutorService;
    private readonly TenantOperationsDbContext _context;

    public ManageTransactionService(IStoredProcedureExecutor spExecutor, 
        IEventExecutorService eventExecutorService,
        TenantOperationsDbContext context)
    {
        _spExecutor = spExecutor;
        _eventExecutorService = eventExecutorService;
        _context = context;
    }

    public async Task<ApiResponse<ResponseCreateTransactionDTO>> CreateTransaction(TrxCreateDTO trxRequest, CancellationToken cancellationToken = default)
    {
        string prefix = trxRequest.TrxPrefix;

        if (string.IsNullOrWhiteSpace(prefix))
        {
            return ApiResponse<ResponseCreateTransactionDTO>.FailResult(Messages.Operations.PrefixMissing, ErrorType.BadRequest);
        }

        var trxEntity = await CreateTrx(trxRequest, cancellationToken);

        var eventResults = new List<EventExecutionResultDTO>();

        var trxDefinition = await GetJsonTrxDefinition(trxRequest.TrxPrefix, cancellationToken);

        if (trxDefinition is not null)
        {
            var transition = GetJsonWorkflowTransition(trxRequest.TrxStates.FromTrxState, trxRequest.TrxStates.ToTrxState, trxDefinition.Workflow);
            var events = transition.Event ?? [];

            if (events.Any())
            {
                var reaEvents = GetJsonReaEvents(events, trxDefinition.Rea.Events);
                eventResults = await _eventExecutorService.ExecuteAsync(reaEvents, trxEntity, cancellationToken);
            }
        }

        var response = new ResponseCreateTransactionDTO
        {
            TrxDocument = trxEntity.TrxDocument,
            Events = eventResults
        };
        return ApiResponse<ResponseCreateTransactionDTO>.SuccessResult(response, Messages.Operations.TransactionCreated);
    }
    public async Task<JsonTrxDefinition?> GetJsonTrxDefinition(string trxPrefix, CancellationToken cancellationToken = default)
    {
        var trx = await _context.TrxDefinitions
            .AsNoTracking()
            .Where(x => x.Prefix == trxPrefix)
            .Select(x => new {x.JsonWorkflow, x.JsonRea})
            .FirstOrDefaultAsync(cancellationToken);

        if (trx is null)
        {
            return null;
        }    

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        var rea = JsonSerializer.Deserialize<JsonReaDefinition>(trx.JsonRea, options)
            ?? throw new InvalidOperationException($"Invalid REA JSON for prefix '{trxPrefix}'.");

        var workflow = JsonSerializer.Deserialize<JsonWorkflowDefinition>(trx.JsonWorkflow, options)
            ?? throw new InvalidOperationException($"Invalid Workflow JSON for prefix '{trxPrefix}'.");

        return new JsonTrxDefinition
        {
            Rea = rea,
            Workflow = workflow
        };
    }
    public JsonWorkflowTransition GetJsonWorkflowTransition(string fromState, string toState, JsonWorkflowDefinition jsonWorkflow)
    {
        var transition = jsonWorkflow.Transitions
            .FirstOrDefault(x => x.From == fromState && x.To == toState);

        if (transition is null)
        {
            throw new InvalidOperationException($"No valid transition from '{fromState} to {toState} was found in Workflow Json.");
        }
        return transition;
    }
    public List<JsonReaEvents> GetJsonReaEvents(List<string> events, List<JsonReaEvents> jsonReaEvents)
    {
        var reaEvents = jsonReaEvents
            .Where(x => events.Contains(x.Id))
            .ToList();

        return reaEvents;
    }
    public async Task<TrxHeader> CreateTrx(TrxCreateDTO trxRequest, CancellationToken cancellationToken = default)
    {
        string prefix = trxRequest.TrxPrefix;
        var trxNumber = await GetNextTransactionNumber(prefix, trxRequest.Location, cancellationToken);
        var trxId = $"{prefix}{trxNumber}";


        var entity = new TrxHeader
        {
            TrxPrefix = prefix,
            TrxDocument = trxId,
            Descr = trxRequest.Descr,
            TrxDate = DateTime.UtcNow,
            Status = trxRequest.TrxStates!.ToTrxState,
            Username = trxRequest.Username,
            Location = trxRequest.Location,
            TrxAttributes = trxRequest.TrxAttributes.Select(a => new TrxAttribute
            {
                AttributeKey = a.AttributeKey,
                AttributeValue = a.AttributeValue
            }).ToList(),
            TrxProducts = trxRequest.TrxProducts.Select(p => new TrxProduct
            {
                IdVariety = p.IdVariety,
                VarietyName = p.VarietyName,
                Sku = p.SKU,
                Qty = p.Qty,
                TrxProductAttributes = p.TrxProductAttributes .Select(pa => new TrxProductAttribute
                {
                    AttributeKey = pa.AttributeKey,
                    AttributeValue = pa.AttributeValue
                }).ToList()
            }).ToList(),
            TrxStates = new List<TrxStates>
            {
                new TrxStates
                {
                    FromTrxState = trxRequest.TrxStates!.FromTrxState,
                    ToTrxState = trxRequest.TrxStates!.ToTrxState,
                    Comments = trxRequest.TrxStates.Comments,
                    StateDate = DateTime.UtcNow
                }
            },
            TrxDetails = trxRequest.TrxDetails.Select(d => new TrxDetail
            {
                DetailType = d.DetailType,
                DetailValue = d.DetailValue
            }).ToList()
        };

        _context.TrxHeaders.Add(entity);

        await _context.SaveChangesAsync(cancellationToken);

        return entity;
    }

    public async Task<ApiResponse<string>> UpdateTrx(long idTrxHeader, TrxUpdateDTO trxRequest, CancellationToken cancellationToken = default)
    {
        var trx = await _context.TrxHeaders
            .FirstOrDefaultAsync(p => p.IdTrxHeader == idTrxHeader, cancellationToken);

        if (trx == null)
            return ApiResponse<string>.FailResult(Messages.Operations.TransactionEmpty, ErrorType.NotFound);

        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        if (trxRequest.TrxStates != null)
        {
            trx.Status = trxRequest.TrxStates.ToTrxState;

            _context.TrxStates.Add(new TrxStates
            {
                IdTrxHeader = idTrxHeader,
                FromTrxState = trxRequest.TrxStates.FromTrxState,
                ToTrxState = trxRequest.TrxStates.ToTrxState,
                Comments = trxRequest.TrxStates.Comments,
                StateDate = DateTime.UtcNow
            });
        }

        if (trxRequest.TrxAttributes != null && trxRequest.TrxAttributes.Any())
        {
            _context.TrxAttributes.AddRange(
                trxRequest.TrxAttributes.Select(a => new TrxAttribute
                {
                    IdTrxHeader = idTrxHeader,
                    AttributeKey = a.AttributeKey,
                    AttributeValue = a.AttributeValue
                }));
        }
        if (trxRequest.TrxProducts != null && trxRequest.TrxProducts.Any())
        {
            _context.TrxProducts.AddRange(
                trxRequest.TrxProducts.Select(p => new TrxProduct
                {
                    IdTrxHeader = idTrxHeader,
                    IdVariety = p.IdVariety,
                    VarietyName = p.VarietyName,
                    Sku = p.SKU,
                    Qty = p.Qty
                }));
        }

        if (trxRequest.TrxDetails != null && trxRequest.TrxDetails.Any())
        {
            _context.TrxDetails.AddRange(
                trxRequest.TrxDetails.Select(d => new TrxDetail
                {
                    IdTrxHeader = idTrxHeader,
                    DetailType = d.DetailType,
                    DetailValue = d.DetailValue
                }));
        }

        await _context.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return ApiResponse<string>.SuccessResultWithoutData(Messages.Operations.TransactionAppend);
    }

    public async Task<ApiResponse<List<TrxResponseDTO>>> GetTrx(SearchTrx? searchTrx, CancellationToken cancellationToken = default)
    {
        searchTrx ??= new SearchTrx();

        var query = _context.TrxHeaders
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchTrx.TrxDocument))
        {
            query = query.Where(x => x.TrxDocument == searchTrx.TrxDocument);
        }
        if (!string.IsNullOrWhiteSpace(searchTrx.TrxPrefix))
        {
            query = query.Where(x => x.TrxPrefix == searchTrx.TrxPrefix);
        }
        if (!string.IsNullOrWhiteSpace(searchTrx.Status))
        {
            query = query.Where(x => x.Status == searchTrx.Status);
        }
        if (!string.IsNullOrWhiteSpace(searchTrx.Location))
        {
            query = query.Where(x => x.Location == searchTrx.Location);
        }
        if (searchTrx.TrxDateFrom.HasValue && searchTrx.TrxDateTo.HasValue)
        {
            query = query.Where(x => x.TrxDate >= searchTrx.TrxDateFrom.Value && x.TrxDate <= searchTrx.TrxDateTo.Value);
        }

        var result = await query
            .Select(x => new TrxResponseDTO
            {
                IdTrxHeader = x.IdTrxHeader,
                TrxPrefix = x.TrxPrefix,
                TrxDocument = x.TrxDocument, 
                Descr = x.Descr,
                TrxDate = x.TrxDate,
                Status = x.Status!,
                Location = x.Location,
                Username = x.Username!, 
                TrxAttributes = x.TrxAttributes
                    .OrderBy(x => x.AttributeKey)
                    .Select(x => new TrxResponseAttributeDTO
                    {
                        IdTrxAttribute = x.IdTrxAttribute,
                        AttributeKey = x.AttributeKey,
                        AttributeValue = x.AttributeValue
                    }).ToList(),
                TrxProducts = x.TrxProducts
                    .OrderBy(x => x.VarietyName)
                    .Select(x => new TrxResponseProductDTO
                    {
                        IdTrxProduct = x.IdTrxProduct,
                        IdVariety = x.IdVariety,
                        VarietyName = x.VarietyName,
                        Sku = x.Sku,
                        Qty = x.Qty,
                        TrxProductAttributes = x.TrxProductAttributes
                            .Select(x => new TrxProductAttributesDTO
                            {
                                AttributeKey = x.AttributeKey,
                                AttributeValue = x.AttributeValue!
                            }).ToList()
                    }).ToList(),
                TrxStates = x.TrxStates
                    .OrderBy(x => x.FromTrxState)
                    .Select(x => new TrxResponseStateDTO
                    {
                        IdTrxState = x.IdTrxState,
                        FromTrxState = x.FromTrxState,
                        ToTrxState = x.ToTrxState,
                        StateDate = x.StateDate,
                        Comments = x.Comments
                    }).ToList(),
                TrxDetails = x.TrxDetails
                    .Select(x => new TrxResponseDetailDTO
                    {
                        IdTrxDetail = x.IdTrxDetail,
                        DetailType = x.DetailType,
                        DetailValue = x.DetailValue
                    }).ToList()
            }).ToListAsync(cancellationToken);

            return ApiResponse<List<TrxResponseDTO>>.SuccessResult(result,Messages.Operations.TransactionLoaded);
    }

    public async Task<string> GetNextTransactionNumber(string prefix, string? location, CancellationToken cancellationToken = default)
    {
        var sp = new StoredProcedureModel
        (
            "GETTRXNUMBER",
            new Dictionary<string, object?>
            {
                { "@Prefix", prefix },
                { "@Location", location }
            }
        ); 

        var result = await _spExecutor.ExecuteSpScalarAsync<string>(sp, cancellationToken);
        
        return result ?? throw new InvalidOperationException("Stored procedure returned no transaction number.");
    }

    public async Task<ApiResponse<List<TrxDefinitionDTO>>> GetFilteredTrxDefinition(SearchTrxDefinition? searchTrxDefinition, CancellationToken cancellationToken = default)
    {

        searchTrxDefinition ??= new SearchTrxDefinition();

        var query = _context.TrxDefinitions
            .AsNoTracking()
            .AsQueryable();

        if (searchTrxDefinition.IdTrxDefinition is int idTrxDefinition)
        {
            query = query.Where(x => x.IdTrxDefinition == idTrxDefinition);
        }
        if (searchTrxDefinition.IdTrxSerie is int idTrxSerie)
        {
            query = query.Where(x => x.IdTrxSerie == idTrxSerie);
        }
        if (!string.IsNullOrWhiteSpace(searchTrxDefinition.TrxPrefix))
        {
            query = query.Where(x => EF.Functions.Like(x.Prefix, $"%{searchTrxDefinition.TrxPrefix}%"));
        }

        var result = await query
            .OrderBy(x => x.IdTrxDefinition)
            .Select(x => new TrxDefinitionDTO
            {
                IdTrxDefinition = x.IdTrxDefinition,
                Prefix = x.Prefix,
                JsonFront = x.JsonFront,
                JsonRea = x.JsonRea,
                JsonWorkflow = x.JsonWorkflow
            }).ToListAsync(cancellationToken);

        return ApiResponse<List<TrxDefinitionDTO>>.SuccessResult(result, Messages.Operations.TrxDefinitionsLoaded);
    }

}