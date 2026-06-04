using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;

namespace GSMOperations.Business.Interfaces;

public interface IManageTransactionService
{
    Task<ApiResponse<string>> CreateTransaction(TrxCreateDTO request, CancellationToken cancellationToken = default);
    Task<ApiResponse<string>> UpdateTrx(long idTrxHeader, TrxUpdateDTO trxRequest, CancellationToken cancellationToken = default);
}