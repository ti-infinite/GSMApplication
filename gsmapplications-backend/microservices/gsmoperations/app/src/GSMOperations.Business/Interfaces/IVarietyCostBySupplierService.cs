using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;

namespace GSMOperations.Business.Interfaces;

public interface IVarietyCostBySupplierService
{
    Task<ApiResponse<List<VarietyCostBySupplierDTO>>> GetFilteredVarietyCost (SearchVarietyCost? searchCriteria, CancellationToken cancellationToken = default);
}