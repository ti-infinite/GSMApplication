using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;

namespace GSMOperations.Business.Interfaces;

public interface IGlobalAndParamAttributeService
{
    Task<ApiResponse<List<GlobalParameterDTO>>> GetAllParamAttributes(CancellationToken cancellation = default);
}