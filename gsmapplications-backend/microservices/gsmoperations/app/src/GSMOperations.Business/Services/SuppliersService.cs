using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.ContextDb;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSOperations.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.Business.Services;

public sealed class SuppliersService : ISuppliersService
{
    private readonly TenantOperationsDbContext _context;

    public SuppliersService(TenantOperationsDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<SupplierDTO>>> GetFilteredSuppliers(SearchSupplier? searchCriteria, CancellationToken cancellation = default)
    {
        searchCriteria ??= new SearchSupplier();

        var query = _context.Suppliers
            .AsNoTracking()
            .Where(s => s.IsActive)
            .AsQueryable();

        if (!string.IsNullOrEmpty(searchCriteria.NameSupplier))
        {
            query = query.Where(s => EF.Functions.Like(s.NameSupplier, $"%{searchCriteria.NameSupplier}%"));
        }
        if (!string.IsNullOrEmpty(searchCriteria.CategorySupplier))
        {
            query = query.Where(s => s.CategorySupplier == searchCriteria.CategorySupplier);
        }
        if (!string.IsNullOrEmpty(searchCriteria.Region))
        {
            query = query.Where(s => EF.Functions.Like(s.Region, $"%{searchCriteria.Region}%"));
        }
        if (!string.IsNullOrEmpty(searchCriteria.Country))
        {
            query = query.Where(s => s.Country == searchCriteria.Country);
        }

        var result = await query
            .OrderBy(s => s.NameSupplier)
            .Select(s => new SupplierDTO
            {
                IdSupplier = s.IdSupplier,
                IdThirdSupplier = s.IdThirdSupplier,
                NameSupplier = s.NameSupplier,
                CategorySupplier = s.CategorySupplier,
                Region = s.Region,
                Country = s.Country,
                Contact = s.Contact,
                IsActive = s.IsActive
            })
            .ToListAsync(cancellation);

        return ApiResponse<List<SupplierDTO>>.SuccessResult(result, Messages.Operations.SuppliersLoaded);
    }

    
}