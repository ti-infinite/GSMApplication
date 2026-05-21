using GSMApplication.Entities.DTOs;

namespace GSMApplication.Business.Interfaces
{
    public interface IMultimediaResourceService
    {
        Task<List<MultimediaResourceDto>> GetMultimediaResourceByCategory(List<string> resourceCategory, CancellationToken cancellationToken = default);
    }


}