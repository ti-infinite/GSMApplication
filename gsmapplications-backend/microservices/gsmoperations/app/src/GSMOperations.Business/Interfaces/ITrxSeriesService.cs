using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;

namespace GSMOperations.Business.Interfaces;

public interface ITrxSeriesService
{
    Task<ApiResponse<List<TrxSeriesDTO>>> GetSeries(CancellationToken cancellationToken = default);
}