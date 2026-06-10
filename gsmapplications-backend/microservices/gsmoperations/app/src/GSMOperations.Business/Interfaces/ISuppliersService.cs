using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSOperations.Entities.Models;

namespace GSMOperations.Business.Interfaces;

public interface ISuppliersService
{
    Task<ApiResponse<List<SupplierDTO>>> GetFilteredSuppliers(SearchSupplier? searchCriteria, CancellationToken cancellation = default);
}