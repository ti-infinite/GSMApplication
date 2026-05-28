using GSMApplication.DataAccess.ContextDb;
using GSMApplication.DataAccess.Entities;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;
using GSMApplication.Entities.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GSMApplication.Business.Services;

public sealed class ApiRulesManagementService : IApiRulesManagementService
{
    private readonly TenantApplicationDbContext _context;

    public ApiRulesManagementService(TenantApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<ApiRule>> CreateApiRule(ApiRuleDTO apiRule, CancellationToken cancellationToken = default)
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

        return ApiResponse<ApiRule>.SuccessResult(entity, Messages.Application.ApiRuleCreated);
    }

    public async Task<ApiResponse<ApiRule>> UpdateApiRule(int idApiRule, ApiRuleDTO apiRule, CancellationToken cancellationToken = default)
    {
        var apiRuleRegister = await _context.ApiRules.FindAsync([idApiRule], cancellationToken);

        if (apiRuleRegister is null)
        {
            return ApiResponse<ApiRule>.FailResult(Messages.Application.ApiRuleEmpty, ErrorType.NotFound);
        }

        apiRuleRegister.ShortName = apiRule.ShortName;
        apiRuleRegister.UrlEndPoint = apiRule.UrlEndPoint;
        apiRuleRegister.Descr = apiRule.Descr;
        apiRuleRegister.Operation = apiRule.Operation;

        await _context.SaveChangesAsync(cancellationToken);

        return ApiResponse<ApiRule>.SuccessResult(apiRuleRegister, Messages.Application.ApiRuleUpdated);
    }

    public async Task<ApiResponse<ApiRule>> DeleteApiRule(int idApiRule, CancellationToken cancellationToken = default)
    {
        var apiRuleRegisterExists = await _context.ApiRules.FindAsync([idApiRule], cancellationToken);

        if (apiRuleRegisterExists is null)
        {
            return ApiResponse<ApiRule>.FailResult(Messages.Application.ApiRuleEmpty, ErrorType.NotFound);
        }

        _context.ApiRules.Remove(apiRuleRegisterExists);

        await _context.SaveChangesAsync(cancellationToken);

        return ApiResponse<ApiRule>.SuccessResult(apiRuleRegisterExists, Messages.Application.ApiRuleDeleted);
    }

    public async Task<ApiResponse<List<ApiRule>>> GetAllApiRules(CancellationToken cancellationToken = default)
    {
        var apiRules = await _context.ApiRules.AsNoTracking().ToListAsync(cancellationToken);

        return ApiResponse<List<ApiRule>>.SuccessResult(apiRules, Messages.Application.ApiRulesRetrieved);
    }

    public async Task<ApiResponse<ApiRule>> GetApiRuleById(int idApiRule, CancellationToken cancellationToken = default)
    {
        var apiRuleRegister = await _context.ApiRules
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.IdApi == idApiRule, cancellationToken);

        if (apiRuleRegister is null)
        {
            return ApiResponse<ApiRule>.FailResult(Messages.Application.ApiRuleEmpty, ErrorType.NotFound);
        }

        return ApiResponse<ApiRule>.SuccessResult(apiRuleRegister, Messages.Application.ApiRulesRetrieved);
    }

}