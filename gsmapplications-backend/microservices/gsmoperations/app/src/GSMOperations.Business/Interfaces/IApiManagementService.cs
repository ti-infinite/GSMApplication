
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;

namespace GSMOperations.Business.Interfaces;

public interface IApiManagementService
{
    Task<ApiResponse<object>> ExecApi(GenericApiDTO genericApiDTO, CancellationToken cancellationToken = default);
}
