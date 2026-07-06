using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;
using GSMApplication.Entities.Models;

namespace GSMApplication.Business.Interfaces;

public interface ILocationService
{
    Task<ApiResponse<List<LocationDTO>>> GetLocations(SearchLocation? searchCriteria, CancellationToken cancellation = default);
}