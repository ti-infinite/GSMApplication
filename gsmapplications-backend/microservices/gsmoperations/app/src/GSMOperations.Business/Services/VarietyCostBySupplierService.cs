using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.ContextDb;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.Business.Services;

public sealed class VarietyCostBySupplierService : IVarietyCostBySupplierService
{
    private readonly TenantOperationsDbContext _context;

    public VarietyCostBySupplierService(TenantOperationsDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<VarietyCostBySupplierDTO>>> GetFilteredVarietyCost (SearchVarietyCost? searchCriteria, CancellationToken cancellationToken)
    {
        searchCriteria ??= new SearchVarietyCost();

        var query = _context.VarietyCostBySuppliers
            .AsNoTracking()
            .Where(x => x.IsActive)
            .AsQueryable();

        if (searchCriteria.IdVariety.HasValue)
        {
            query = query.Where(x => x.IdVariety == searchCriteria.IdVariety.Value);
        }
        if (searchCriteria.IdSupplier.HasValue)
        {
            query = query.Where(x => x.IdSupplier == searchCriteria.IdSupplier.Value);
        }

        var result = await query
            .OrderBy(x => x.IdVariety)
            .Select(x => new VarietyCostBySupplierDTO
            {
                IdVariety = x.IdVariety,
                IdSupplier = x.IdSupplier,
                ProductionCost = x.ProductionCost,
                ExtraCost = x.ExtraCost
            })
            .ToListAsync(cancellationToken);

        return ApiResponse<List<VarietyCostBySupplierDTO>>.SuccessResult(result, Messages.Operations.VarietiesLoaded);        
    }

}