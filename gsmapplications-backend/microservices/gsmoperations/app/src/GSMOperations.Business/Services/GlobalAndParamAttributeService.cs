using GSMOperations.Business.Interfaces;
using GSMOperations.DataAccess.ContextDb;
using GSMOperations.Entities.Common;
using GSMOperations.Entities.DTOs;
using Microsoft.EntityFrameworkCore;

namespace GSMOperations.Business.Services;

public sealed class GlobalAndParamAttributeService : IGlobalAndParamAttributeService
{

    private readonly TenantOperationsDbContext _context;
    public GlobalAndParamAttributeService(TenantOperationsDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<GlobalParameterDTO>>> GetAllParamAttributes(CancellationToken cancellation = default)
    {
        var result = await _context.GlobalParameters
            .Select(x => new GlobalParameterDTO
            {
                IdParameter = x.IdParameter,
                ParamCategory = x.ParamCategory,
                ShortName = x.ShortName,
                Descr = x.Descr,
                ParamAttributes = x.ParamAttributes.Select(a => new ParamAttributeDTO
                {
                    ShortName = a.ShortName,
                    Code = a.Code,
                    Descr = a.Descr
                }).ToList()
            })
            .ToListAsync(cancellation);

        if (result.Count == 0)
        {
            return ApiResponse<List<GlobalParameterDTO>>.FailResult(Messages.Operations.ParamsEmpty, ErrorType.NotFound);
        }

        return ApiResponse<List<GlobalParameterDTO>>.SuccessResult(result, Messages.Operations.ParamsLoaded);
    }

}