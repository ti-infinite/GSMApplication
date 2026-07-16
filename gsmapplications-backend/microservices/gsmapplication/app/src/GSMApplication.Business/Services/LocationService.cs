using GSMApplication.Business.Interfaces;
using GSMApplication.DataAccess.ContextDb;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;
using GSMApplication.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.Business.Services;

public sealed class LocationService : ILocationService
{
    private readonly TenantApplicationDbContext _context;

    public LocationService(TenantApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<LocationDTO>>> GetLocations(SearchLocation? searchCriteria, CancellationToken cancellation = default)
    {
        searchCriteria ??= new SearchLocation();

        var query = _context.Locations
            .AsNoTracking()
            .Where(l => l.IsActive)
            .AsQueryable();
        
        if (searchCriteria.IdLocation is int idLocation)
        {
            query = query.Where(x => x.IdLocation == idLocation);
        }
        if (!string.IsNullOrWhiteSpace(searchCriteria.CodeLocation))
        {
            query = query.Where(l => EF.Functions.Like(l.CodeLocation, $"%{searchCriteria.CodeLocation}%"));
        }

        var result = await query
            .OrderBy(x => x.CodeLocation)
            .Select(l => new LocationDTO
            {
                IdLocation = l.IdLocation,
                IdThirdLocation = l.IdThirdLocation,
                CodeLocation = l.CodeLocation,
                Descr = l.Descr,
                Email = l.Email,
                PhoneNumber = l.PhoneNumber,
                AddressLocation = l.AddressLocation
            })
            .ToListAsync(cancellation);

        return ApiResponse<List<LocationDTO>>.SuccessResult(result, Messages.Application.LocationsLoaded);
    }

}