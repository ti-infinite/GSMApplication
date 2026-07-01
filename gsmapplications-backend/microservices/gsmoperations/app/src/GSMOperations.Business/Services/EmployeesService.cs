using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.ContextDb;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using GSMOperations.Entities.Models;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.Business.Services;

public sealed class EmployeesService : IEmployeesService
{
    private readonly TenantOperationsDbContext _context;

    public EmployeesService(TenantOperationsDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<EmployeeDTO>>> GetFilteredEmployees(SearchEmployee? searchCriteria, CancellationToken cancellation = default)
    {
        searchCriteria ??= new SearchEmployee();

        var query = _context.Employees
            .AsNoTracking()
            .Where(e => e.IsActive)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchCriteria.FullName))
        {
            query = query.Where(e => EF.Functions.Like(e.FullName, $"%{searchCriteria.FullName}%"));
        }
        if (!string.IsNullOrWhiteSpace(searchCriteria.Location))
        {
            query = query.Where(e => e.Location == searchCriteria.Location);
        }

        var result = await query
            .OrderBy(e => e.FullName)
            .Select(e => new EmployeeDTO
            {
                IdEmployee = e.IdEmployee,
                FullName = e.FullName,
                Location = e.Location,
                ContactNumber = e.ContactNumber,
                Email = e.Email,
            })
            .ToListAsync(cancellation);

        return ApiResponse<List<EmployeeDTO>>.SuccessResult(result, Messages.Operations.EmployeesLoaded);
        
    }



}