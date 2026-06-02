using GSMApplication.DataAccess.ContextDb;
using GSMApplication.DataAccess.Entities;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;
using GSMApplication.Business.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.Business.Services;

public sealed class ApiRulesManagementService : IApiRulesManagementService
{
    private readonly TenantApplicationDbContext _context;

    public ApiRulesManagementService(TenantApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<ResponseApiRuleDTO>> CreateApiRule(ApiRuleDTO apiRule, CancellationToken cancellationToken = default)
    {
        var entity = new ApiRule
        {
            ShortName = apiRule.ShortName,
            Descr = apiRule.Descr,
            UrlEndPoint = apiRule.UrlEndPoint,
            Operation = apiRule.Operation
        };

        _context.ApiRules.Add(entity);

        await _context.SaveChangesAsync(cancellationToken);

        var response = new ResponseApiRuleDTO
        {
            ShortName = entity.ShortName,
            Descr = entity.Descr,
            UrlEndPoint = entity.UrlEndPoint,
            Operation = entity.Operation
        };

        return ApiResponse<ResponseApiRuleDTO>.SuccessResult(response, Messages.Application.ApiRuleCreated);
    }

    public async Task<ApiResponse<ResponseApiRuleDTO>> UpdateApiRule(int idApiRule, ApiRuleDTO apiRule, CancellationToken cancellationToken = default)
    {
        var apiRuleRegister = await _context.ApiRules.FindAsync([idApiRule], cancellationToken);

        if (apiRuleRegister is null)
        {
            return ApiResponse<ResponseApiRuleDTO>.FailResult(Messages.Application.ApiRuleEmpty, ErrorType.NotFound);
        }

        apiRuleRegister.ShortName = apiRule.ShortName;
        apiRuleRegister.UrlEndPoint = apiRule.UrlEndPoint;
        apiRuleRegister.Descr = apiRule.Descr;
        apiRuleRegister.Operation = apiRule.Operation;

        await _context.SaveChangesAsync(cancellationToken);

        var response = new ResponseApiRuleDTO
        {
            ShortName = apiRuleRegister.ShortName,
            Descr = apiRuleRegister.Descr,
            UrlEndPoint = apiRuleRegister.UrlEndPoint,
            Operation = apiRuleRegister.Operation
        };

        return ApiResponse<ResponseApiRuleDTO>.SuccessResult(response, Messages.Application.ApiRuleUpdated);
    }

    public async Task<ApiResponse<ResponseApiRuleDTO>> DeleteApiRule(int idApiRule, CancellationToken cancellationToken = default)
    {
        var apiRuleRegisterExists = await _context.ApiRules.FindAsync([idApiRule], cancellationToken);

        if (apiRuleRegisterExists is null)
        {
            return ApiResponse<ResponseApiRuleDTO>.FailResult(Messages.Application.ApiRuleEmpty, ErrorType.NotFound);
        }

        _context.ApiRules.Remove(apiRuleRegisterExists);

        await _context.SaveChangesAsync(cancellationToken);

        var response = new ResponseApiRuleDTO
        {
            IdApi = apiRuleRegisterExists.IdApi
        };

        return ApiResponse<ResponseApiRuleDTO>.SuccessResult(response, Messages.Application.ApiRuleDeleted);
    }

    public async Task<ApiResponse<List<ResponseApiRuleDTO>>> GetAllApiRules(CancellationToken cancellationToken = default)
    {
        var apiRules = await _context.ApiRules.AsNoTracking().ToListAsync(cancellationToken);

        var response = apiRules.Select(apiRule => new ResponseApiRuleDTO
        {
            IdApi = apiRule.IdApi,
            ShortName = apiRule.ShortName,
            Descr = apiRule.Descr,
            UrlEndPoint = apiRule.UrlEndPoint,
            Operation = apiRule.Operation
        }).ToList();

        return ApiResponse<List<ResponseApiRuleDTO>>.SuccessResult(response, Messages.Application.ApiRulesRetrieved);
    }

    public async Task<ApiResponse<ResponseApiRuleDTO>> GetApiRuleById(int idApiRule, CancellationToken cancellationToken = default)
    {
        var apiRuleRegister = await _context.ApiRules
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.IdApi == idApiRule, cancellationToken);

        if (apiRuleRegister is null)
        {
            return ApiResponse<ResponseApiRuleDTO>.FailResult(Messages.Application.ApiRuleEmpty, ErrorType.NotFound);
        }

        var response = new ResponseApiRuleDTO
        {
            IdApi = apiRuleRegister.IdApi,
            ShortName = apiRuleRegister.ShortName,
            Descr = apiRuleRegister.Descr,
            UrlEndPoint = apiRuleRegister.UrlEndPoint,
            Operation = apiRuleRegister.Operation
        };

        return ApiResponse<ResponseApiRuleDTO>.SuccessResult(response, Messages.Application.ApiRulesRetrieved);
    }

}