using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;

namespace GSMOperations.Business.Interfaces;

public interface IMasterHerbsService
{
    Task<ApiResponse<List<MasterProductDTO>>> GetMasterProducts(CancellationToken cancellation = default);
}