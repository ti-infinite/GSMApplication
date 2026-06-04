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
                IdTrxHeader = trxRequest.IdTrxHeader,
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
                    IdTrxHeader = trxRequest.IdTrxHeader,
                    AttributeKey = a.AttributeKey,
                    AttributeValue = a.AttributeValue
                }));
        }
        if (trxRequest.TrxProducts != null && trxRequest.TrxProducts.Any())
        {
            _context.TrxProducts.AddRange(
                trxRequest.TrxProducts.Select(p => new TrxProduct
                {
                    IdTrxHeader = trxRequest.IdTrxHeader,
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
                    IdTrxHeader = trxRequest.IdTrxHeader,
                    DetailType = d.DetailType,
                    DetailValue = d.DetailValue
                }));
        }

        await _context.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return ApiResponse<string>.SuccessResultWithoutData(Messages.Operations.TransactionAppend);
    }



}