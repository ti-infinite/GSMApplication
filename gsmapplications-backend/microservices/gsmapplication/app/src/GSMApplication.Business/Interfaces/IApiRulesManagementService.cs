using GSMApplication.Entities.Common;
using GSMApplication.Entities.DTOs;

namespace GSMApplication.Business.Interfaces;

public interface IApiRulesManagementService
{
    Task<ApiResponse<ResponseApiRuleDTO>> CreateApiRule(ApiRuleDTO apiRule, CancellationToken cancellationToken = default);
    Task<ApiResponse<ResponseApiRuleDTO>> UpdateApiRule(int idApiRule, ApiRuleDTO apiRule, CancellationToken cancellationToken = default);
    Task<ApiResponse<ResponseApiRuleDTO>> DeleteApiRule(int idApiRule, CancellationToken cancellationToken = default);
    Task<ApiResponse<List<ResponseApiRuleDTO>>> GetAllApiRules(CancellationToken cancellationToken = default);
    Task<ApiResponse<ResponseApiRuleDTO>> GetApiRuleById(int idApiRule, CancellationToken cancellationToken = default);
}