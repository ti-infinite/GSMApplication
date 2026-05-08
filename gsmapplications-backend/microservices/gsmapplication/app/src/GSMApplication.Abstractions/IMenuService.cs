using GSMApplication.Entities.DTOs;

namespace GSMApplication.Abstractions;

public interface IMenuService
{
    Task<GetMenuResponseDto> GetMenuAsync(int idProfile, CancellationToken cancellationToken = default);
}
