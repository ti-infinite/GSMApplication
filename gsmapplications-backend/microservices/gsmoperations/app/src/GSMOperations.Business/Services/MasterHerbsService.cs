using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.ContextDb;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using Microsoft.EntityFrameworkCore;

namespace GSMOPerations.Business.Services;

public sealed class MasterHerbsService : IMasterHerbsService
{

    private readonly TenantOperationsDbContext _context;
    
    public MasterHerbsService(TenantOperationsDbContext context)
    {
        _context = context;
    }
    
    public async Task<ApiResponse<List<MasterProductDTO>>> GetMasterProducts(CancellationToken cancellation = default)
    {
        var result = await _context.MasterProducts
            .Select(x => new MasterProductDTO
            {
                MasterProductName = x.MasterProductName,
                SKU = x.Sku,
                MeasurementUnit = x.MeasurementUnit,
                MeasurementUnitValue = x.MeasurementUnitValue,
                MV = x.MasterVarieties
                .Where(v => v.IsActive)
                .Select(v => new MasterVarietyDTO
                {
                    IdVariety = v.IdVariety,
                    Name = v.Name,
                    Qty = v.Qty
                })
                .ToList()
            })
            .ToListAsync(cancellation);

        if (result.Count == 0)
        {
            return ApiResponse<List<MasterProductDTO>>.FailResult(Messages.Operations.CategoriesEmpty, ErrorType.NotFound);
        }

        return ApiResponse<List<MasterProductDTO>>.SuccessResult(result, Messages.Operations.CategoriesLoaded);
    }

}