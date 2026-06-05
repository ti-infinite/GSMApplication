using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.ContextDb;
using GSMOperations.DataAccess.Entities;
using GSMOperations.DataAccess.Interfaces;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.Business.Services;

public sealed class ManageTransactionService : IManageTransactionService
{
    private readonly IStoredProcedureExecutor _spExecutor;
    private readonly TenantOperationsDbContext _context;

    public ManageTransactionService(IStoredProcedureExecutor spExecutor, TenantOperationsDbContext context)
    {
        _spExecutor = spExecutor;
        _context = context;
    }

    public async Task<ApiResponse<string>> CreateTransaction(TrxCreateDTO request, CancellationToken cancellationToken = default)
    {
        string prefix = request.TrxPrefix;

        if (string.IsNullOrWhiteSpace(prefix))
        {
            return ApiResponse<string>.FailResult(Messages.Operations.PrefixMissing, ErrorType.BadRequest);
        }

        var trxDoc = await CreateTrx(request, cancellationToken);

        return ApiResponse<string>.SuccessResult(trxDoc, Messages.Operations.TransactionCreated);
    }

    public async Task<string> CreateTrx(TrxCreateDTO trxRequest, CancellationToken cancellationToken = default)
    {
        string prefix = trxRequest.TrxPrefix;
        var trxNumber = await GetNextTransactionNumber(prefix, cancellationToken);
        var trxId = $"{prefix}{trxNumber}";
        var status = trxRequest.TrxStates!.TrxState;


        var entity = new TrxHeader
        {
            TrxPrefix = prefix,
            TrxDocument = $"{prefix}{trxNumber}",
            Descr = trxRequest.Descr,
            TrxDate = DateTime.UtcNow,
            Status = trxRequest.TrxStates!.TrxState,
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
                Qty = p.Qty
            }).ToList(),
            TrxStates = new List<TrxStates>
            {
                new TrxStates
                {
                    TrxState = trxRequest.TrxStates!.TrxState,
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

        return entity.TrxDocument;
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
            trx.Status = trxRequest.TrxStates.TrxState;

            _context.TrxStates.Add(new TrxStates
            {
                IdTrxHeader = idTrxHeader,
                TrxState = trxRequest.TrxStates.TrxState,
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

    public async Task<ApiResponse<List<TrxResponseDTO>>> GetTrx(SearchTrx searchTrx, CancellationToken cancellationToken = default)
    {
        var query = _context.TrxHeaders.AsQueryable();

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
                        Qty = x.Qty
                    }).ToList(),
                TrxStates = x.TrxStates
                    .OrderBy(x => x.TrxState)
                    .Select(x => new TrxResponseStateDTO
                    {
                        IdTrxState = x.IdTrxState,
                        TrxState = x.TrxState,
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

    public async Task<long> GetNextTransactionNumber(string prefix, CancellationToken cancellationToken = default)
    {
        var sp = new StoredProcedureModel
        (
            "GETTRXNUMBER",
            new Dictionary<string, object?>
            {
                { "@Prefix", prefix }
            }
        ); 

        var result = await _spExecutor.ExecuteSpScalarAsync<long?>(sp, cancellationToken);
        
        return result ?? throw new InvalidOperationException("Stored procedure returned null");    
    }

}