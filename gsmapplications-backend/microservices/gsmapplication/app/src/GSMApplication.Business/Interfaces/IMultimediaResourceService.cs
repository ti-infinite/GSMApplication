using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;

namespace GSMApplication.Business.Interfaces
{
    public interface IMultimediaResourceService
    {
        Task<ApiResponse<List<MultimediaResourceDto>>> GetMultimediaResourceByCategory(List<string> resourceCategory, CancellationToken cancellationToken = default);
    }


}