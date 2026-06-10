using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;

namespace GSMApplication.Abstractions;

public interface IMenuService
{
    Task<ApiResponse<GetMenuDto>> GetMenuAsync(int idProfile, CancellationToken cancellationToken = default);
}
