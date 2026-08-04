using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.ContextDb;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.Business.Services;

public sealed class TrxSeriesService : ITrxSeriesService
{

    private readonly TenantOperationsDbContext _context;

    public TrxSeriesService(TenantOperationsDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<TrxSeriesDTO>>> GetSeries(CancellationToken cancellationToken)
    {
        var response = await _context.TrxSeries
            .AsNoTracking()
            .OrderBy(x => x.Prefix)
            .Select(x => new TrxSeriesDTO
            {
                Prefix = x.Prefix,
                Descr = x.Descr,
                CurrentNumber = x.CurrentNumber,
                HasNumberByLocation = x.HasNumberByLocation
            })
            .ToListAsync(cancellationToken);

        return ApiResponse<List<TrxSeriesDTO>>.SuccessResult(response, Messages.Operations.SeriesLoaded);
    }
}