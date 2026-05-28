using GSMApplication.DataAccess.Entities;
using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;

namespace GSMApplication.Entities.Interfaces;

public interface IApiRulesManagementService
{
    Task<ApiResponse<ApiRule>> CreateApiRule(ApiRuleDTO apiRule, CancellationToken cancellationToken = default);
    Task<ApiResponse<ApiRule>> UpdateApiRule(int idApiRule, ApiRuleDTO apiRule, CancellationToken cancellationToken = default);
    Task<ApiResponse<ApiRule>> DeleteApiRule(int idApiRule, CancellationToken cancellationToken = default);
    Task<ApiResponse<List<ApiRule>>> GetAllApiRules(CancellationToken cancellationToken = default);
    Task<ApiResponse<ApiRule>> GetApiRuleById(int idApiRule, CancellationToken cancellationToken = default);
}