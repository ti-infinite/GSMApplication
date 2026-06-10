using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;

namespace GSMOperations.Business.Interfaces
{
    public interface ICategoriesService
    {
        Task<ApiResponse<string>> GetCategories(CancellationToken cancellationToken);
    }
}